export async function thenCatch(p:Promise<unknown>) {
  return p.then((res) => [res, null]).catch((err) => [null, err]);
}