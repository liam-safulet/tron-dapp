import './App.css'
import { useState, useEffect } from 'react'
import { TronWeb } from 'tronweb';

declare global {
  interface Window {
    binancew3w: {
      tron: any
    },
  }
}

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io', // 主网
  // fullHost: 'https://api.nileex.io', // 测试网
});

function App() {
  const tronProvider = window.binancew3w.tron;
  const provider = tronProvider
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [recipient, setRecipient] = useState<string>('TASoYA4UCoQWZgtipn6sHZJkokiU7GTzkK');
  const [amount, setAmount] = useState<string>('0.1');
  const [loading, setLoading] = useState<boolean>(false);
  const [signedData, setSignedData] = useState<string>('');

  // 示例合约地址 (USDT-TRC20)
  const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  
  // 合约 function selector
  const TRANSFER_FUNCTION_SELECTOR = '0xa9059cbb';

  useEffect(() => {
    // 初始化 provider
    const initProvider = async () => {
      try {
        // 检查是否已连接
        try {
          const { address } = await tronProvider.getAccount();
          if (address) {
            setAccount(address);
            const balance = await tronWeb.trx.getBalance(address);
            setBalance(String(tronWeb.fromSun(balance)));
          }
        } catch (error) {
          console.log('Not connected yet', error);
        }
      } catch (error) {
        console.error('Error initializing provider:', error);
      }
    };

    initProvider();
  }, []);

  // 连接钱包
  const connectWallet = async () => {
    try {
      if (!tronProvider) {
        alert('Provider not initialized');
        return;
      }

      setLoading(true);
      const { address } = await tronProvider.getAccount();
      setAccount(address);

      // 获取余额
      const balance = await tronWeb.trx.getBalance(address);
      setBalance(String(tronWeb.fromSun(balance)));
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  // 断开连接
  const disconnectWallet = async () => {
    try {
      if (tronProvider) {
        await tronProvider.disconnect();
        setAccount('');
        setBalance('0');
        setRecipient('');
        setAmount('');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  // 构建触发智能合约的交易
  const buildTriggerSmartContractTx = async (
    contractAddress: string,
    functionSelector: string,
    _parameter: string,
    feeLimit: number = 100000000
  ) => {
    try {
      // 构建合约调用参数
      const parameter = {
        contract_address: contractAddress,
        function_selector: functionSelector,
        parameter: _parameter,
        fee_limit: feeLimit,
        call_value: 0, // 如果需要发送 TRX，在这里设置数量
        owner_address: account
      };

      // 构建交易
      const transaction = {
        visible: false,
        txID: '',
        raw_data: {
          contract: [{
            parameter: {
              value: parameter,
              type_url: 'type.googleapis.com/protocol.TriggerSmartContract'
            },
            type: 'TriggerSmartContract'
          }],
          ref_block_bytes: '0000',
          ref_block_hash: '0000000000000000',
          expiration: Date.now() + 60 * 60 * 1000, // 1小时过期
          timestamp: Date.now(),
        },
        raw_data_hex: ''
      };

      return transaction;
    } catch (error) {
      console.error('Error building transaction:', error);
      throw error;
    }
  };

  // 只签名智能合约交易
  const handleSignTransaction = async () => {
    if (!provider || !account || !recipient || !amount) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // 构建参数
      // 对于 TRC20 transfer，参数格式为: transfer(address,uint256)
      const encodedAddress = tronWeb.address.toHex(recipient).replace('0x', '').padStart(64, '0');
      const encodedAmount = tronWeb.toHex(Number(amount) * 1e6).replace('0x', '').padStart(64, '0');
      const parameter = encodedAddress + encodedAmount;

      // 构建交易
      const transaction = await buildTriggerSmartContractTx(
        CONTRACT_ADDRESS,
        TRANSFER_FUNCTION_SELECTOR,
        parameter
      );

      // 只签名交易
      const signedTx = await provider.signTransaction(transaction);
      setSignedData(JSON.stringify(signedTx, null, 2));
      alert('Transaction signed successfully!');
    } catch (error) {
      console.error('Transaction signing failed:', error);
      alert('Failed to sign transaction');
    } finally {
      setLoading(false);
    }
  };

  // 签名并发送智能合约交易
  const handleSignAndSendTransaction = async () => {
    if (!provider || !account || !recipient || !amount) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // 构建参数
      const encodedAddress = tronWeb.address.toHex(recipient).replace('0x', '').padStart(64, '0');
      const encodedAmount = tronWeb.toHex(Number(amount) * 1e6).replace('0x', '').padStart(64, '0');
      const parameter = encodedAddress + encodedAmount;

      // 构建交易
      const transaction = await buildTriggerSmartContractTx(
        CONTRACT_ADDRESS,
        TRANSFER_FUNCTION_SELECTOR,
        parameter
      );

      // 签名并发送交易
      const result = await provider.signAndSendTransaction(transaction);
      
      alert('Transaction sent! Hash: ' + result.txid);
      setSignedData(JSON.stringify(result, null, 2));

    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Transaction failed. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Tron Smart Contract Interaction</h1>
      
      {!account ? (
        <button onClick={connectWallet} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div>
          <div className="wallet-info">
            <div>
              <p>Account: {account}</p>
              <p>Balance: {balance} TRX</p>
            </div>
            <button 
              onClick={disconnectWallet}
              className="disconnect-button"
            >
              Disconnect
            </button>
          </div>

          <div className="contract-form">
            <h2>Contract Interaction (USDT Transfer)</h2>
            <input
              type="text"
              placeholder="Recipient Address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              type="number"
              placeholder="Amount (USDT)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="button-group">
              <button 
                onClick={handleSignTransaction}
                disabled={loading}
              >
                Sign Only
              </button>
              <button 
                onClick={handleSignAndSendTransaction}
                disabled={loading}
              >
                Sign & Send
              </button>
            </div>
          </div>

          {signedData && (
            <div className="signed-data">
              <h3>Transaction Data:</h3>
              <pre>{signedData}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App