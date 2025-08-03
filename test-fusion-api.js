#!/usr/bin/env node

// Test script for 1inch Fusion API integration
const BASE_URL = 'http://localhost:3000';

// Test data for USDC -> WETH swap on Ethereum
const testSwap = {
  fromTokenAddress: '0xa0b86a33e6441b8c4f27ead9083c756cc2', // USDC
  toTokenAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  amount: '1000000', // 1 USDC (6 decimals)
  walletAddress: '0x742d35Cc6634C0532925a3b8D8C9C1a4E5f6A342', // Test wallet
  enableEstimate: true,
  complexityLevel: 'medium'
};

async function testAPI(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🧪 Testing ${method} ${url}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.text();
    
    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    
    try {
      const jsonData = JSON.parse(data);
      console.log(`📊 Response:`, JSON.stringify(jsonData, null, 2));
      return { success: true, status: response.status, data: jsonData };
    } catch (e) {
      console.log(`📄 Raw Response:`, data);
      return { success: false, status: response.status, data };
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting 1inch Fusion API Tests\n');
  console.log('⚙️ Test Configuration:');
  console.log(`- From Token: USDC (${testSwap.fromTokenAddress})`);
  console.log(`- To Token: WETH (${testSwap.toTokenAddress})`);
  console.log(`- Amount: ${testSwap.amount} (1 USDC)`);
  console.log(`- Wallet: ${testSwap.walletAddress}`);
  
  const tests = [
    {
      name: '1. Fusion Quote API',
      endpoint: '/api/1inch/fusion/quote',
      method: 'POST',
      body: testSwap
    },
    {
      name: '2. Fusion Tokens API (Ethereum)',
      endpoint: '/api/1inch/fusion/tokens/1',
      method: 'GET'
    },
    {
      name: '3. Fusion Prices API',
      endpoint: '/api/1inch/fusion/prices?tokens=0xa0b86a33e6441b8c4f27ead9083c756cc2,0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      method: 'GET'
    },
    {
      name: '4. Aggregation Quote API (Fallback)',
      endpoint: '/api/1inch/aggregation/quote',
      method: 'POST',
      body: {
        src: testSwap.fromTokenAddress,
        dst: testSwap.toTokenAddress,
        amount: testSwap.amount,
        from: testSwap.walletAddress,
        slippage: 1
      }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${test.name}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await testAPI(test.endpoint, test.method, test.body);
    results.push({ ...test, result });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  results.forEach((test, index) => {
    const status = test.result.success ? '✅' : '❌';
    const httpStatus = test.result.status || 'N/A';
    console.log(`${index + 1}. ${test.name}: ${status} (HTTP ${httpStatus})`);
  });
  
  const successCount = results.filter(r => r.result.success).length;
  console.log(`\n🎯 Success Rate: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  
  // Check for specific success indicators
  const quoteTest = results.find(r => r.name.includes('Fusion Quote'));
  if (quoteTest && quoteTest.result.success && quoteTest.result.data) {
    console.log('\n✅ FUSION INTEGRATION STATUS: WORKING');
    
    if (quoteTest.result.data.dstAmount || quoteTest.result.data.toTokenAmount) {
      console.log('   📈 Quote data received successfully');
      console.log('   🔗 Real 1inch Fusion API integration confirmed');
    }
  } else {
    console.log('\n⚠️  FUSION INTEGRATION STATUS: NEEDS ATTENTION');
    console.log('   💡 Check API keys and network connectivity');
  }
}

// Check if running directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAPI, runTests };