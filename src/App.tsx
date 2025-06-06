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
    
    // 添加消息签名相关状态
    const [message, setMessage] = useState<string>('Hello, TronLink!');
    const [signedMessage, setSignedMessage] = useState<string>('');

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
        setSignedMessage('');
        setRecipient('');
        setAmount('1');
        setMessage('Hello, TronLink!');
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

    // 签名消息 - 使用官方推荐的方法
    const signMessage = async () => {
        if (!account || !message.trim()) {
            alert('请确保钱包已连接且消息不为空');
            return;
        }

        try {
            setLoading(true);

            // 检查 TronLink 是否准备就绪
            if (!window.tronLink.ready) {
                throw new Error('TronLink 未准备就绪');
            }

            const tronweb = window.tronLink.tronWeb;
            
            // 将消息转换为十六进制字符串
            const hexMessage = tronweb.toHex(message);
            console.log('Original message:', message);
            console.log('Hex message:', hexMessage);

            // 使用 tronweb.trx.sign 签名十六进制消息
            const signedString = await tronweb.trx.sign(hexMessage);
            
            const signatureData = {
                originalMessage: message,
                hexMessage: hexMessage,
                signature: signedString,
                signedAt: new Date().toISOString(),
                address: account,
                method: 'tronweb.trx.sign'
            };
            
            setSignedMessage(JSON.stringify(signatureData, null, 2));
            alert('消息签名成功！');
            
        } catch (error) {
            console.error('消息签名失败:', error);
            
            // 处理具体的错误信息
            if (error.message.includes('Invalid transaction provided')) {
                alert('签名失败: 提供的消息格式无效');
            } else if (error.message.includes('User rejected')) {
                alert('用户拒绝了签名请求');
            } else {
                alert('消息签名失败: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // 新增：直接签名十六进制消息的方法
    const signHexMessage = async () => {
        if (!account) {
            alert('请确保钱包已连接');
            return;
        }

        try {
            setLoading(true);

            // 检查 TronLink 是否准备就绪
            if (!window.tronLink.ready) {
                throw new Error('TronLink 未准备就绪');
            }

            const tronweb = window.tronLink.tronWeb;
            
            // 示例十六进制消息（可以自定义）
            const hexMessage = "0x1e"; // 或者使用用户输入的十六进制字符串
            console.log('Signing hex message:', hexMessage);

            // 使用 tronweb.trx.sign 签名十六进制消息
            const signedString = await tronweb.trx.sign(hexMessage);
            
            const signatureData = {
                hexMessage: hexMessage,
                signature: signedString,
                signedAt: new Date().toISOString(),
                address: account,
                method: 'tronweb.trx.sign (direct hex)'
            };
            
            setSignedMessage(JSON.stringify(signatureData, null, 2));
            alert('十六进制消息签名成功！');
            
        } catch (error) {
            console.error('十六进制消息签名失败:', error);
            
            // 处理具体的错误信息
            if (error.message.includes('Invalid transaction provided')) {
                alert('签名失败: 提供的十六进制消息格式无效');
            } else if (error.message.includes('User rejected')) {
                alert('用户拒绝了签名请求');
            } else {
                alert('十六进制消息签名失败: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
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
                                color: 'white',
                                border: 'none', 
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            断开连接
                        </button>
                    </div>

                    {/* 消息签名部分 */}
                    <div style={{ 
                        padding: '15px',
                        borderRadius: '8px', 
                        marginBottom: '20px' 
                    }}>
                        <h3>消息签名 (官方方法)</h3>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                            使用 tronweb.trx.sign() 方法签名消息
                        </p>
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label>要签名的消息:</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="输入要签名的消息（将自动转换为十六进制）"
                                rows={3}
                                style={{ 
                                    width: '100%', 
                                    padding: '8px', 
                                    marginTop: '5px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
                                    resize: 'vertical'
                                }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={signMessage}
                                disabled={loading}
                                style={{ 
                                    flex: 1,
                                    padding: '10px 20px', 
                                    color: 'white',
                                    border: 'none', 
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? '签名中...' : '签名消息'}
                            </button>
                            
                            <button 
                                onClick={signHexMessage}
                                disabled={loading}
                                style={{ 
                                    flex: 1,
                                    padding: '10px 20px', 
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none', 
                                    borderRadius: '4px',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? '签名中...' : '签名示例十六进制'}
                            </button>
                        </div>
                    </div>

                    {/* 智能合约交易表单 */}
                    <div style={{ 
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

                    {/* 消息签名结果显示 */}
                    {signedMessage && (
                        <div style={{ 
                            backgroundColor: '#f8f9fa', 
                            padding: '15px', 
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3>消息签名结果</h3>
                            <pre style={{ 
                                backgroundColor: '#e9ecef', 
                                padding: '10px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px'
                            }}>
                                {signedMessage}
                            </pre>
                        </div>
                    )}

                    {/* 交易数据显示 */}
                    {signedData && (
                        <div style={{ 
                            backgroundColor: '#f8f9fa', 
                            padding: '15px',
                            borderRadius: '8px' 
                        }}>
                            <h3>智能合约交易数据</h3>
                            <pre style={{ 
                                backgroundColor: '#e9ecef', 
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