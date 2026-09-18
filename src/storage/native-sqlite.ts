export type NativeDatabase = {
  execSync(source: string): void;
  runSync(source: string, ...params: unknown[]): unknown;
  getFirstSync<T>(source: string): T | null;
};

export async function getNativeDatabase(): Promise<NativeDatabase | undefined> {
  return undefined;
}
