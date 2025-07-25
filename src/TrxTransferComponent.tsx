import React, { useState } from 'react';
import { TronWeb } from 'tronweb';

// TRX 转账组件的 Props 接口
interface TrxTransferComponentProps {
    account: string;
    tronWeb: TronWeb;
    binanceW3W: any;
    onBalanceUpdate: (address: string) => Promise<void>;
}

// TRX 转账结果接口
interface TrxTransferResult {
    originalTransaction: unknown;
    signedTransaction?: unknown;
    broadcastResult?: unknown;
    txid?: string;
    success: boolean;
    signedAt: string;
    address: string;
    method: 'signTransaction' | 'signAndSendTransaction';
}

const TrxTransferComponent: React.FC<TrxTransferComponentProps> = ({
    account,
    tronWeb,
    binanceW3W,
    onBalanceUpdate
}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [trxRecipient, setTrxRecipient] = useState<string>('TUaRyMRuzyX6tHZRoHz645PL1bn3E5NrWC');
    const [trxAmount, setTrxAmount] = useState<string>('1.0');
    const [trxTransferData, setTrxTransferData] = useState<string>('');

    // 构建 TRX 转账交易
    const buildTrxTransaction = async (recipient: string, amount: string): Promise<unknown> => {
        try {
            // 验证地址格式
            if (!tronWeb.isAddress(account) || !tronWeb.isAddress(recipient)) {
                throw new Error('无效的地址格式');
            }

            // 将 TRX 转换为 SUN (1 TRX = 1,000,000 SUN)
            const amountNumber = parseFloat(amount);
            const amountInSun = tronWeb.toSun(amountNumber);
            const amountInSunNumber = Number(amountInSun);
            
            console.log('构建 TRX 转账交易:', {
                from: account,
                to: recipient,
                amount: `${amount} TRX`,
                amountInSun: `${amountInSunNumber} SUN`
            });

            // 构建转账交易
            const transaction = await tronWeb.transactionBuilder.sendTrx(
                recipient,        // 接收地址
                amountInSunNumber, // 金额 (SUN)
                account           // 发送地址
            );

            if (!transaction) {
                throw new Error('构建交易失败');
            }

            return transaction;
            
        } catch (error) {
            console.error('构建 TRX 转账交易失败:', error);
            throw error;
        }
    };

    // 检查余额是否足够
    const checkBalance = async (amount: string): Promise<boolean> => {
        try {
            const balance = await tronWeb.trx.getBalance(account);
            const balanceInTrx = tronWeb.fromSun(balance);
            const balanceInTrxStr = String(balanceInTrx);
            const amountNum = parseFloat(amount);
            
            console.log(`余额检查: ${balanceInTrxStr} TRX >= ${amountNum} TRX ?`);
            
            return parseFloat(balanceInTrxStr) >= amountNum;
        } catch (error) {
            console.error('检查余额失败:', error);
            return false;
        }
    };

    // 验证转账参数
    const validateTransferParams = (recipient: string, amount: string): void => {
        if (!account || !recipient || !amount) {
            throw new Error('转账参数不完整');
        }
        
        if (!tronWeb.isAddress(account)) {
            throw new Error('发送地址格式无效');
        }
        
        if (!tronWeb.isAddress(recipient)) {
            throw new Error('接收地址格式无效');
        }
        
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            throw new Error('转账金额必须大于0');
        }
        
        if (account === recipient) {
            throw new Error('发送地址和接收地址不能相同');
        }
    };

    // TRX 转账 - signTransaction 方法
    const signTrxTransaction = async (): Promise<void> => {
        if (!account || !trxRecipient || !trxAmount) {
            alert('请填写完整信息');
            return;
        }

        try {
            setLoading(true);

            if (!binanceW3W?.tron) {
                throw new Error('钱包未连接');
            }

            // 验证参数
            validateTransferParams(trxRecipient, trxAmount);

            // 检查余额
            const hasEnoughBalance = await checkBalance(trxAmount);
            if (!hasEnoughBalance) {
                throw new Error('余额不足');
            }

            // 构建交易
            const transaction = await buildTrxTransaction(trxRecipient, trxAmount);
            console.log('TRX 转账交易构建完成:', transaction);

            // 使用钱包签名交易
            const signedTx = await binanceW3W.tron.signTransaction(transaction);
            console.log('TRX 转账交易签名完成:', signedTx);
            
            // 手动广播交易
            const broadcastResult = await tronWeb.trx.sendRawTransaction(signedTx);
            console.log('TRX 转账广播结果:', broadcastResult);
            
            const result: TrxTransferResult = {
                originalTransaction: transaction,
                signedTransaction: signedTx,
                broadcastResult: broadcastResult,
                txid: broadcastResult.txid || broadcastResult.transaction?.txID,
                success: broadcastResult.result || false,
                signedAt: new Date().toISOString(),
                address: account,
                method: 'signTransaction'
            };
            
            setTrxTransferData(JSON.stringify(result, null, 2));
            
            if (broadcastResult.result) {
                alert(`TRX 转账成功！\n交易ID: ${broadcastResult.txid || broadcastResult.transaction?.txID}`);
                // 更新余额
                await onBalanceUpdate(account);
            } else {
                alert('TRX 转账失败: ' + (broadcastResult.message || '未知错误'));
            }
            
        } catch (error) {
            console.error('TRX 转账失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('TRX 转账失败: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // TRX 转账 - signAndSendTransaction 方法
    const signAndSendTrxTransaction = async (): Promise<void> => {
        if (!account || !trxRecipient || !trxAmount) {
            alert('请填写完整信息');
            return;
        }

        try {
            setLoading(true);

            if (!binanceW3W?.tron) {
                throw new Error('钱包未连接');
            }

            // 验证参数
            validateTransferParams(trxRecipient, trxAmount);

            // 检查余额
            const hasEnoughBalance = await checkBalance(trxAmount);
            if (!hasEnoughBalance) {
                throw new Error('余额不足');
            }

            // 构建交易
            const transaction = await buildTrxTransaction(trxRecipient, trxAmount);
            console.log('TRX 转账交易构建完成:', transaction);

            // 使用钱包签名并发送交易
            const result = await binanceW3W.tron.signAndSendTransaction(transaction);
            console.log('TRX 转账签名并发送结果:', result);
            
            const transferResult: TrxTransferResult = {
                originalTransaction: transaction,
                signedTransaction: result,
                broadcastResult: result,
                txid: result.txid,
                success: result.wcResult.result || false,
                signedAt: new Date().toISOString(),
                address: account,
                method: 'signAndSendTransaction'
            };
            
            setTrxTransferData(JSON.stringify(transferResult, null, 2));

            if (result.result) {
                alert(`TRX 转账成功！\n交易ID: ${result.txid}`);
                // 更新余额
                await onBalanceUpdate(account);
            } else {
                alert('TRX 转账失败');
            }
        } catch (error) {
            console.error('TRX 转账失败:', error);
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            alert('TRX 转账失败: ' + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleTrxRecipientChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setTrxRecipient(e.target.value);
    };

    const handleTrxAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setTrxAmount(e.target.value);
    };

    return (
        <div>
            {/* TRX 转账表单 */}
            <div style={{
                backgroundColor: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h3>TRX 转账</h3>
                <p style={{fontSize: '14px', color: '#666', marginBottom: '15px'}}>
                    原生 TRX 转账（非智能合约调用）
                </p>

                <div style={{marginBottom: '15px'}}>
                    <label>接收地址:</label>
                    <input
                        type="text"
                        value={trxRecipient}
                        onChange={handleTrxRecipientChange}
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
                <div style={{marginBottom: '15px'}}>
                    <label>金额 (TRX):</label>
                    <input
                        type="number"
                        value={trxAmount}
                        onChange={handleTrxAmountChange}
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

                <div style={{display: 'flex', gap: '10px'}}>
                    <button
                        onClick={signTrxTransaction}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: '#ff6b35',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? '处理中...' : 'TRX signTransaction'}
                    </button>
                    <button
                        onClick={signAndSendTrxTransaction}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? '处理中...' : 'TRX signAndSendTransaction'}
                    </button>
                </div>
            </div>

            {/* TRX 转账结果显示 */}
            {trxTransferData && (
                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <pre style={{
                        backgroundColor: '#e9ecef',
                        padding: '10px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '12px'
                    }}>
                        {trxTransferData}
                    </pre>
                </div>
            )}
        </div>
    );
};

export default TrxTransferComponent; 