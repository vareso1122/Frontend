/**
 * Universal Solana Wallet Adapter
 * Compatible with all major Solana wallets
 * Phantom, Solflare, Magic Eden, Ledger, Backpack, Slope, Solong, Coin98, etc.
 */

const WALLET_PROVIDERS = {
    phantom: {
        name: 'Phantom',
        check: () => window.phantom?.solana?.isPhantom || (window.solana && window.solana.isPhantom),
        get: () => window.phantom?.solana || window.solana
    },
    solflare: {
        name: 'Solflare',
        check: () => window.solflare?.isSolflare,
        get: () => window.solflare
    },
    magicEden: {
        name: 'Magic Eden',
        check: () => window.magicEden?.solana?.isMagicEden,
        get: () => window.magicEden?.solana
    },
    backpack: {
        name: 'Backpack',
        check: () => window.backpack?.solana?.isBackpack,
        get: () => window.backpack?.solana
    },
    ledger: {
        name: 'Ledger Live',
        check: () => window.ledger?.solana?.isLedger,
        get: () => window.ledger?.solana
    },
    slope: {
        name: 'Slope',
        check: () => window.slope?.solana?.isSlope,
        get: () => window.slope?.solana
    },
    solong: {
        name: 'Solong',
        check: () => window.solong?.solana?.isSolong,
        get: () => window.solong?.solana
    },
    coin98: {
        name: 'Coin98',
        check: () => window.coin98?.solana?.isCoin98,
        get: () => window.coin98?.solana
    },
    generic: {
        name: 'Generic Solana Wallet',
        check: () => window.solana,
        get: () => window.solana
    }
};

/**
 * Get the first available wallet provider
 * Returns the provider object and its name
 */
const getAvailableWallet = () => {
    console.log('[WALLET] Checking for available wallets...');
    
    for (const [key, wallet] of Object.entries(WALLET_PROVIDERS)) {
        try {
            if (wallet.check && wallet.check()) {
                const provider = wallet.get();
                if (provider) {
                    console.log(`[WALLET] Found: ${wallet.name}`);
                    return { provider, name: wallet.name };
                }
            }
        } catch (e) {
            console.warn(`[WALLET] Error checking ${wallet.name}:`, e);
        }
    }
    
    console.warn('[WALLET] No Solana wallet provider found');
    return { provider: null, name: null };
};

/**
 * Get all available wallet providers (for multi-wallet support later)
 */
const getAllAvailableWallets = () => {
    const available = [];
    
    for (const [key, wallet] of Object.entries(WALLET_PROVIDERS)) {
        try {
            if (wallet.check && wallet.check()) {
                const provider = wallet.get();
                if (provider) {
                    available.push({ provider, name: wallet.name, key });
                }
            }
        } catch (e) {
            // Silently fail for unavailable wallets
        }
    }
    
    console.log(`[WALLET] Available wallets: ${available.map(w => w.name).join(', ')}`);
    return available;
};

/**
 * Connect to wallet - FIXED VERSION
 */
const connectToWallet = async (provider) => {
    console.log('[WALLET] Attempting to connect...');
    
    if (!provider) {
        throw new Error('No wallet provider available');
    }

    try {
        // Check if already connected
        if (provider.isConnected) {
            console.log('[WALLET] Already connected');
            if (provider.publicKey) {
                return provider.publicKey;
            }
        }
        
        // Attempt to connect
        console.log('[WALLET] Requesting user connection...');
        
        // For Phantom and most wallets
        if (provider.connect) {
            try {
                // Phantom returns { publicKey }
                const result = await provider.connect({ onlyIfTrusted: false });
                console.log('[WALLET] Connect result:', result);
                
                if (result && result.publicKey) {
                    console.log('[WALLET] Got publicKey from connect result');
                    return result.publicKey;
                }
            } catch (connectError) {
                console.error('[WALLET] Connect method error:', connectError);
                
                // If connect fails, check if publicKey is now available
                if (provider.publicKey) {
                    console.log('[WALLET] Using publicKey from provider');
                    return provider.publicKey;
                }
                throw connectError;
            }
        }
        
        // Fallback: check if publicKey is available after interaction
        if (provider.publicKey) {
            console.log('[WALLET] Using publicKey from provider after interaction');
            return provider.publicKey;
        }
        
        throw new Error('Failed to get public key from wallet');
        
    } catch (error) {
        console.error('[WALLET] Connection error:', error);
        
        if (error.code === 4001 || error.message?.includes('rejected')) {
            throw new Error('User rejected wallet connection');
        }
        
        throw new Error(`Failed to connect to wallet: ${error.message}`);
    }
};

/**
 * Disconnect from wallet
 */
const disconnectWallet = async (provider) => {
    try {
        if (provider.disconnect) {
            await provider.disconnect();
            console.log('[WALLET] Disconnected');
        }
    } catch (error) {
        console.error('[WALLET] Disconnect error:', error);
    }
};

/**
 * Sign a transaction
 */
const signTransaction = async (provider, transaction) => {
    try {
        if (!provider.signTransaction) {
            throw new Error('Wallet does not support transaction signing');
        }
        
        const signedTx = await provider.signTransaction(transaction);
        console.log('[WALLET] Transaction signed');
        return signedTx;
        
    } catch (error) {
        console.error('[WALLET] Sign error:', error);
        throw error;
    }
};

/**
 * Sign and send a transaction
 */
const signAndSendTransaction = async (provider, transaction) => {
    try {
        if (!provider.signAndSendTransaction) {
            throw new Error('Wallet does not support signing and sending transactions');
        }
        
        const response = await provider.signAndSendTransaction(transaction);
        console.log('[WALLET] Transaction signed and sent:', response);
        return response;
        
    } catch (error) {
        console.error('[WALLET] SignAndSend error:', error);
        throw error;
    }
};

/**
 * Listen for wallet events
 */
const setupWalletListeners = (provider) => {
    if (provider.on) {
        provider.on('connect', () => {
            console.log('[WALLET] Connected event fired');
            window.dispatchEvent(new CustomEvent('walletConnected', { 
                detail: { address: provider.publicKey?.toString() } 
            }));
        });
        
        provider.on('disconnect', () => {
            console.log('[WALLET] Disconnected event fired');
            window.dispatchEvent(new CustomEvent('walletDisconnected'));
        });
        
        provider.on('accountChanged', (newPublicKey) => {
            console.log('[WALLET] Account changed:', newPublicKey?.toString());
            window.dispatchEvent(new CustomEvent('walletAccountChanged', { 
                detail: { address: newPublicKey?.toString() } 
            }));
        });
    }
};

// Export for use in other scripts
window.WalletAdapter = {
    getAvailableWallet,
    getAllAvailableWallets,
    connectToWallet,
    disconnectWallet,
    signTransaction,
    signAndSendTransaction,
    setupWalletListeners,
    WALLET_PROVIDERS
};

console.log('[WALLET] Universal Wallet Adapter loaded');
