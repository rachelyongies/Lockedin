// Isolated crypto loader to handle WebAssembly imports
let cryptoInstance: any = null;

export async function loadBitcoinCrypto() {
  if (typeof window === 'undefined') {
    throw new Error('Bitcoin crypto can only be loaded in browser');
  }

  if (cryptoInstance) {
    return cryptoInstance;
  }

  // Dynamic import of heavy crypto libraries
  const [bitcoin, ecc, { BIP32Factory }, bip39, { ECPairFactory }] = await Promise.all([
    import('bitcoinjs-lib'),
    import('tiny-secp256k1'),
    import('bip32'),
    import('bip39'),
    import('ecpair')
  ]);

  // Initialize
  bitcoin.initEccLib(ecc);
  const bip32 = BIP32Factory(ecc);
  const ECPair = ECPairFactory(ecc);

  cryptoInstance = {
    bitcoin,
    ecc,
    bip32,
    bip39,
    ECPair
  };

  return cryptoInstance;
}