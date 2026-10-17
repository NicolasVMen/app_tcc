/** Limita a espera; o chamador também invalida a sessão para ignorar conclusões tardias. */
export async function withTimeout<T>(operation: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
