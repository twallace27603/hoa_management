import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DefaultAzureCredential } from '@azure/identity';
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
} from '@azure/storage-blob';

// Files never pass through the API. Callers upload/download directly against
// Blob Storage using a short-lived SAS URL minted here, after an
// authorization check has already happened in the calling controller/guard.
// This keeps Container Apps stateless and avoids paying compute for file
// bytes in transit.
@Injectable()
export class StorageService {
  private readonly client: BlobServiceClient;
  private readonly accountName: string;

  constructor(config: ConfigService) {
    this.accountName = config.getOrThrow<string>('AZURE_STORAGE_ACCOUNT_NAME');
    this.client = new BlobServiceClient(
      `https://${this.accountName}.blob.core.windows.net`,
      new DefaultAzureCredential(),
    );
  }

  async generateUploadUrl(
    containerName: string,
    blobPath: string,
    expiresInMinutes = 15,
  ): Promise<string> {
    return this.generateSasUrl(
      containerName,
      blobPath,
      'racw',
      expiresInMinutes,
    );
  }

  async generateDownloadUrl(
    containerName: string,
    blobPath: string,
    expiresInMinutes = 15,
  ): Promise<string> {
    return this.generateSasUrl(containerName, blobPath, 'r', expiresInMinutes);
  }

  private async generateSasUrl(
    containerName: string,
    blobPath: string,
    permissions: string,
    expiresInMinutes: number,
  ): Promise<string> {
    const containerClient = this.client.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobPath);

    const userDelegationKey = await this.client.getUserDelegationKey(
      new Date(),
      new Date(Date.now() + expiresInMinutes * 60 * 1000),
    );

    const sas = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: blobPath,
        permissions: BlobSASPermissions.parse(permissions),
        protocol: SASProtocol.Https,
        startsOn: new Date(),
        expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      },
      userDelegationKey,
      this.accountName,
    );

    return `${blobClient.url}?${sas.toString()}`;
  }
}
