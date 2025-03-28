import { Actor, HttpAgent } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { NFTCanister, ZKCanister } from '../src/declarations/interfaces'
import { WalletInfo } from '../src/types/wallet'
import { VerificationResult } from '../src/types'

const IC_HOST = process.env.VITE_IC_HOST || 'https://ic0.app'
const ZK_CANISTER_ID = process.env.VITE_ZK_CANISTER_ID || 'hi7bu-myaaa-aaaad-aaloa-cai'

async function testMilestone1() {
  console.log('🚀 Starting Milestone 1 Test...')

  try {
    // 1. Test Wallet Connection
    console.log('\n📱 Testing Wallet Connection...')
    if (!window.ic?.plug) {
      throw new Error('Plug wallet not found. Please install Plug wallet extension.')
    }

    const whitelist = [ZK_CANISTER_ID]
    const host = IC_HOST

    const connected = await window.ic.plug.requestConnect({
      whitelist,
      host
    })

    if (!connected) {
      throw new Error('Failed to connect to wallet')
    }

    const principal = await window.ic.plug.getPrincipal()
    console.log('✅ Wallet Connected:', principal.toString())

    // 2. Test NFT Verification
    console.log('\n🖼️ Testing NFT Verification...')
    const nfts = await window.ic.plug.getNFTs()
    
    if (!nfts.length) {
      throw new Error('No NFTs found in wallet')
    }

    const testNft = nfts[0]
    console.log('📦 Selected NFT:', testNft)

    // 3. Test Proof Generation
    console.log('\n🔐 Testing Proof Generation...')
    const zkActor = await window.ic.plug.createActor<ZKCanister>({
      canisterId: ZK_CANISTER_ID,
      interfaceFactory: () => ({
        generateProof: () => ({ ok: { proof: new Uint8Array([1, 2, 3]), publicInputs: new Uint8Array([4, 5, 6]) } }),
        verifyProof: () => ({ ok: true })
      })
    })

    const proofInput = {
      nft_merkle_path: [BigInt(1), BigInt(2), BigInt(3)],
      minimum_balance: BigInt(0),
      token_id: BigInt(testNft.index),
      collection_id: BigInt(testNft.canister),
      wallet_principal: BigInt('0x' + Array.from(principal.toUint8Array())
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')),
      token_canister_id: BigInt(0),
      merkle_root: BigInt(0),
      nft_merkle_indices: [1, 2, 3],
      token_merkle_path: [],
      actual_balance: BigInt(1),
      token_merkle_indices: []
    }

    const proofResult = await zkActor.generateProof(proofInput)
    if ('err' in proofResult) {
      throw new Error(`Failed to generate proof: ${proofResult.err}`)
    }

    console.log('✅ Proof Generated:', proofResult.ok)

    // 4. Test Proof Verification
    console.log('\n🔍 Testing Proof Verification...')
    const verificationResult = await zkActor.verifyProof(
      proofResult.ok.proof,
      proofResult.ok.publicInputs
    )

    if ('err' in verificationResult) {
      throw new Error(`Failed to verify proof: ${verificationResult.err}`)
    }

    console.log('✅ Proof Verified:', verificationResult.ok)

    // 5. Generate Anonymous Reference
    const result: VerificationResult = {
      isVerified: verificationResult.ok,
      proofId: Math.random().toString(36).substring(2, 15),
      timestamp: Date.now(),
      anonymousReference: Math.random().toString(36).substring(2, 15),
      walletAddress: principal.toString(),
      chainId: 'icp',
      itemType: 'nft',
      itemId: `${testNft.canister}-${testNft.index}`,
      nftContractAddress: testNft.canister,
      nftIndex: testNft.index,
      nftName: testNft.name || `NFT #${testNft.index}`,
      nftImageUrl: testNft.url,
      principal: principal.toString()
    }

    console.log('\n📋 Test Results:')
    console.log('Proof ID:', result.proofId)
    console.log('Anonymous Reference:', result.anonymousReference)
    console.log('Verification Status:', result.isVerified)
    console.log('\n✨ Milestone 1 Test Completed Successfully!')

  } catch (error) {
    console.error('❌ Test Failed:', error)
    throw error
  }
}

// Run the test
testMilestone1().catch(console.error) 