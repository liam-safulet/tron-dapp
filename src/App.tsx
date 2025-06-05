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
  const provider = tronProvider
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [recipient, setRecipient] = useState<string>('TASoYA4UCoQWZgtipn6sHZJkokiU7GTzkK');
  const [amount, setAmount] = useState<string>('0.1');
  const [message, setMessage] = useState<string>('');
  const [signedData, setSignedData] = useState<string>('');
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

  // 新增：签名消息
  const handleSignMessage = async () => {
    if (!provider || !message) {
      alert('Please enter a message to sign');
      return;
    }

    try {
      setLoading(true);
      const signedMsg = await provider.signMessage(message);
      setSignedData(JSON.stringify(signedMsg, null, 2));
      alert('Message signed successfully!');
    } catch (error) {
      console.error('Signing failed:', error);
      alert('Failed to sign message');
    } finally {
      setLoading(false);
    }
  };

  // 新增：只签名交易，不广播
  const handleSignTransaction = async () => {
    if (!provider || !account || !recipient || !amount) {
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
          
          {/* 消息签名部分 */}
          <div className="sign-form">
            <h2>Sign Message</h2>
            <input
              type="text"
              placeholder="Enter message to sign"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button 
              onClick={handleSignMessage}
              disabled={loading || !message}
            >
              Sign Message
            </button>
          </div>

          {/* 交易签名部分 */}
          <div className="transfer-form">
            <h2>Sign Transaction</h2>
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
            <div className="button-group">
              <button 
                onClick={handleSignTransaction}
                disabled={loading}
              >
                Sign Only
              </button>
              <button 
                onClick={handleTransfer}
                disabled={loading}
              >
                Sign & Send
              </button>
            </div>
          </div>

          {/* 显示签名结果 */}
          {signedData && (
            <div className="signed-data">
              <h3>Signed Data:</h3>
              <pre>{signedData}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App