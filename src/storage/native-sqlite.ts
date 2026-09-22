export type NativeDatabase = {
  execSync(source: string): void;
  runSync(source: string, ...params: unknown[]): unknown;
  getFirstSync<T>(source: string): T | null;
  getAllSync<T>(source: string, ...params: unknown[]): T[];
};

export async function getNativeDatabase(): Promise<NativeDatabase | undefined> {
  return undefined;
}
