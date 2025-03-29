declare module 'crypto-browserify' {
  interface Hash {
    update(data: Buffer | string): Hash;
    digest(encoding: string): string;
  }

  const crypto: {
    createHash(algorithm: string): Hash;
  };
  
  export default crypto;
} 