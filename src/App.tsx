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

function App() {
  const tronProvider = window.binancew3w.tron;

  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [recipient, setRecipient] = useState<string>('TASoYA4UCoQWZgtipn6sHZJkokiU7GTzkK');
  const [amount, setAmount] = useState<string>('0.1');
  const [loading, setLoading] = useState<boolean>(false);

  // TronWeb 实例
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io', // 主网
    // fullHost: 'https://api.nileex.io', // 测试网
  });

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

  // 转账
  const handleTransfer = async () => {
    if (!account || !recipient || !amount) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // 构建交易
      const transaction = await tronWeb.transactionBuilder.sendTrx(
        recipient,
        Number(tronWeb.toSun(Number(amount))),
        account
      );

      // 签名并发送交易
      const signedTx = await tronProvider.signAndSendTransaction(transaction);
      
      alert('Transfer successful! Transaction ID: ' + signedTx.txid);

      // 更新余额
      const newBalance = await tronWeb.trx.getBalance(account);
      setBalance(String(tronWeb.fromSun(newBalance)));

      // 清空输入
      setRecipient('');
      setAmount('');
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed. Please check the console for details.');
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

  return (
    <div className="App">
      <h1>Tron DApp</h1>
      
      {!account ? (
        <button 
          onClick={connectWallet} 
          disabled={loading}
        >
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
          
          <div className="transfer-form">
            <h2>Transfer TRX</h2>
            <input
              type="text"
              placeholder="Recipient Address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <input
              type="number"
              placeholder="Amount (TRX)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button 
              onClick={handleTransfer}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Send TRX'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App