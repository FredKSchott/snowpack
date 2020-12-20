import type {
  CommandOptions,
  ImportMap,
  PackageSource,
} from "../../types";

export class SourceImportMap {
  private _promise: Promise<ImportMap>;

  constructor(
    private readonly pkgSource: PackageSource,
    commandOptions: CommandOptions,
  ) {
    this._promise = pkgSource.prepare(commandOptions);

  }

  recoverMissingPackageImport(missingPackages: string[]) {
    this._promise = this.pkgSource.recoverMissingPackageImport(missingPackages);
  }

  public async getImportMap() {
    return await this._promise;
  }

  public async getImportKeys() {
    return Object.keys((await this.getImportMap()).imports);
  }
}