import keypair from 'keypair'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export type KeyPair = {
  publicKey: string
  privateKey: string
}

export const getKey = () : Promise<KeyPair> => {
  return new Promise((resolve, reject) => {
    const keyPath = '../../storage/';
    try {
      if (existsSync(join(__dirname, keyPath, 'private.key')) && existsSync(join(__dirname, keyPath, 'public.key'))) {
        const publicKey = readFileSync(join(__dirname, keyPath, 'public.key'), 'utf8');
        const privateKey = readFileSync(join(__dirname, keyPath, 'private.key'), 'utf8');
        resolve({ privateKey, publicKey });
      } else {
        const pair = keypair();
        console.log('Creating new key pair...');
        writeFileSync(join(__dirname, keyPath, 'public.key'), pair.public);
        writeFileSync(join(__dirname, keyPath, 'private.key'), pair.private);
        console.log('Key pair created!');
        resolve({ privateKey: pair.private, publicKey: pair.public });
      }
    } catch (error) {
      reject(error);
    }
  });
}
