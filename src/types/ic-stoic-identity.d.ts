declare module 'ic-stoic-identity' {
  import { Identity } from '@dfinity/agent';
  import { Principal } from '@dfinity/principal';
  
  export class StoicIdentity implements Identity {
    static connect(): Promise<StoicIdentity>;
    static disconnect(): void;
    getPrincipal(): Principal;
    transformRequest(request: any): Promise<any>;
    getPublicKey(): Promise<ArrayBuffer>;
    sign(blob: ArrayBuffer): Promise<ArrayBuffer>;
  }
} 