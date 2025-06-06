import './App.css'
import {useState, useEffect} from 'react'
import {TronWeb} from 'tronweb';

declare global {
    interface Window {
        tronLink: {
            ready: boolean;
            request: (params: any) => Promise<any>;
            tronWeb: any;
        }
    }
}

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io', // 主网
    // fullHost: 'https://api.nileex.io', // 测试网
});

function App() {
    const [account, setAccount] = useState<string>('');
    const [balance, setBalance] = useState<string>('0');
    const [loading, setLoading] = useState<boolean>(false);
    const [signedData, setSignedData] = useState<string>('');
    const [recipient, setRecipient] = useState<string>('TASoYA4UCoQWZgtipn6sHZJkokiU7GTzkK');
    const [amount, setAmount] = useState<string>('0.1');


    // USDT TRC20 合约地址
    const CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    // transfer(address,uint256) 函数选择器
    const TRANSFER_FUNCTION_SELECTOR = 'a9059cbb';

    useEffect(() => {
        checkWalletConnection();
    }, []);

    // 检查钱包连接状态
    const checkWalletConnection = async () => {
        try {
            if (window.tronLink && window.tronLink.ready) {
                if (window.tronLink.tronWeb && window.tronLink.tronWeb.defaultAddress.base58) {
                    const address = window.tronLink.tronWeb.defaultAddress.base58;
                    setAccount(address);
                    await getBalance(address);
                }
            }
        } catch (error) {
            console.log('Wallet not connected:', error);
        }
    };

    // 获取余额
    const getBalance = async (address: string) => {
        try {
            const balance = await tronWeb.trx.getBalance(address);
            setBalance(tronWeb.fromSun(balance));
        } catch (error) {
            console.error('Error getting balance:', error);
        }
    };

    // 连接钱包
    const connectWallet = async () => {
        try {
            if (!window.tronLink) {
                alert('请先安装 TronLink 钱包插件');
                return;
            }

            setLoading(true);
            
            const result = await window.tronLink.request({
                method: 'tron_requestAccounts'
            });

            if (result.code === 200) {
                const address = window.tronLink.tronWeb.defaultAddress.base58;
                setAccount(address);
                await getBalance(address);
            } else {
                throw new Error('连接失败');
            }
        } catch (error) {
            console.error('连接钱包失败:', error);
            alert('连接钱包失败');
        } finally {
            setLoading(false);
        }
    };

    // 断开连接
    const disconnectWallet = () => {
        setAccount('');
        setBalance('0');
        setSignedData('');
        setRecipient('');
        setAmount('1');
        alert('钱包已断开连接');
    };

    // 构建智能合约交易参数 - 使用对象数组格式
    const buildContractParameters = (recipientAddress: string, transferAmount: string) => {
        const amountInWei = Number(transferAmount) * 1000000; // USDT 有 6 位小数
        return [
            { type: 'address', value: recipientAddress },
            { type: 'uint256', value: amountInWei }
        ];
    };

    // 只签名智能合约交易
    const signTransaction = async () => {
        if (!account || !recipient || !amount) {
            alert('请填写完整信息');
            return;
        }

        try {
            setLoading(true);

            // 构建合约调用参数 - 现在返回对象数组
            const parameter = buildContractParameters(recipient, amount);
            console.log('parameter:', parameter);

            // 构建 triggerSmartContract 交易
            const transaction = await window.tronLink.tronWeb.transactionBuilder.triggerSmartContract(
                CONTRACT_ADDRESS,
                TRANSFER_FUNCTION_SELECTOR,
                {
                    feeLimit: 50000000, // 50 TRX 费用限制
                    callValue: 0, // 不发送 TRX
                },
                parameter,  // 对象数组格式的参数
                account
            );

            console.log('Transaction result:', transaction);

            if (!transaction.result || !transaction.result.result) {
                throw new Error('构建交易失败: ' + JSON.stringify(transaction.result));
            }

            console.log('About to sign:', transaction.transaction);
            // 只签名，不发送
            const signedTx = await window.tronLink.tronWeb.trx.sign(transaction.transaction);
            
            setSignedData(JSON.stringify(signedTx, null, 2));
            alert('智能合约交易签名成功！');
        } catch (error) {
            console.error('签名失败:', error);
            alert('签名失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // 签名并发送智能合约交易
    const signAndSendTransaction = async () => {
        if (!account || !recipient || !amount) {
            alert('请填写完整信息');
            return;
        }

        try {
            setLoading(true);

            // 构建合约调用参数 - 现在返回对象数组
            const parameter = buildContractParameters(recipient, amount);

            // 构建 triggerSmartContract 交易
            const transaction = await window.tronLink.tronWeb.transactionBuilder.triggerSmartContract(
                CONTRACT_ADDRESS,
                TRANSFER_FUNCTION_SELECTOR,
                {
                    feeLimit: 50000000, // 50 TRX 费用限制
                    callValue: 0, // 不发送 TRX
                },
                parameter,  // 对象数组格式的参数
                account
            );

            if (!transaction.result || !transaction.result.result) {
                throw new Error('构建交易失败: ' + JSON.stringify(transaction.result));
            }

            // 签名交易
            const signedTx = await window.tronLink.tronWeb.trx.sign(transaction.transaction);
            
            // 发送交易
            const result = await window.tronLink.tronWeb.trx.sendRawTransaction(signedTx);
            
            if (result.result) {
                setSignedData(JSON.stringify(result, null, 2));
                alert('智能合约交易发送成功！交易哈希: ' + result.txid);
                // 更新余额
                await getBalance(account);
            } else {
                throw new Error('交易发送失败: ' + (result.message || '未知错误'));
            }
        } catch (error) {
            console.error('交易失败:', error);
            alert('交易失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h1>TronLink 智能合约 dApp</h1>
            
            {!account ? (
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <button 
                        onClick={connectWallet} 
                        disabled={loading}
                        style={{ 
                            padding: '12px 24px', 
                            fontSize: '16px', 
                            backgroundColor: '#007bff', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? '连接中...' : '连接 TronLink 钱包'}
                    </button>
                </div>
            ) : (
                <div>
                    {/* 钱包信息 */}
                    <div style={{ 
                        padding: '15px',
                        borderRadius: '8px', 
                        marginBottom: '20px' 
                    }}>
                        <h3>钱包信息</h3>
                        <p><strong>地址:</strong> {account}</p>
                        <p><strong>TRX 余额:</strong> {balance} TRX</p>
                        <button 
                            onClick={disconnectWallet}
                            style={{ 
                                padding: '8px 16px', 
                                backgroundColor: '#dc3545', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            断开连接
                        </button>
                    </div>

                    {/* 智能合约交易表单 */}
                    <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '15px', 
                        borderRadius: '8px', 
                        marginBottom: '20px' 
                    }}>
                        <h3>USDT 转账 (TRC20)</h3>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                            合约地址: {CONTRACT_ADDRESS}
                        </p>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label>接收地址:</label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                placeholder="输入接收地址"
                                style={{ 
                                    width: '100%', 
                                    padding: '8px', 
                                    marginTop: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label>金额 (USDT):</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="输入金额"
                                step="0.000001"
                                style={{ 
                                    width: '100%', 
                                    padding: '8px', 
                                    marginTop: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd'
                                }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={signTransaction}
                                disabled={loading}
                                style={{ 
                                    flex: 1,
                                    padding: '10px', 
                                    backgroundColor: '#28a745', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? '处理中...' : '仅签名交易'}
                            </button>
                            <button 
                                onClick={signAndSendTransaction}
                                disabled={loading}
                                style={{ 
                                    flex: 1,
                                    padding: '10px', 
                                    backgroundColor: '#007bff', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? '处理中...' : '签名并发送'}
                            </button>
                        </div>
                    </div>

                    {/* 交易数据显示 */}
                    {signedData && (
                        <div style={{ 
                            padding: '15px',
                            borderRadius: '8px' 
                        }}>
                            <h3>智能合约交易数据</h3>
                            <pre style={{ 
                                padding: '10px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px'
                            }}>
                                {signedData}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App