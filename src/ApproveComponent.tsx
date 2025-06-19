import React, { useState } from 'react';
import { TronWeb } from 'tronweb';

interface ApproveComponentProps {
    account: string;
    tronWeb: TronWeb;
    binanceW3W: any;
    onApproveResult?: (result: any) => void;
}

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const APPROVE_FUNCTION_SELECTOR = 'approve(address,uint256)';
const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // 2^256-1

const ApproveComponent: React.FC<ApproveComponentProps> = ({ account, tronWeb, binanceW3W, onApproveResult }) => {
    const [spender, setSpender] = useState('');
    const [approveAmount, setApproveAmount] = useState('');
    const [unlimited, setUnlimited] = useState(false);
    const [loading, setLoading] = useState(false);
    const [approveResult, setApproveResult] = useState<string>('');

    const buildApproveParams = (spenderAddr: string, amount: string) => {
        return [
            { type: 'address', value: spenderAddr },
            { type: 'uint256', value: amount }
        ];
    };

    const buildApproveTx = async (spenderAddr: string, amount: string) => {
        const params = buildApproveParams(spenderAddr, amount);
        const tx = await tronWeb.transactionBuilder.triggerSmartContract(
            USDT_CONTRACT,
            APPROVE_FUNCTION_SELECTOR,
            {
                feeLimit: 50000000,
                callValue: 0,
            },
            params,
            account
        );
        if (!tx.result?.result) throw new Error('构建 approve 交易失败: ' + JSON.stringify(tx.result));
        return tx.transaction;
    };

    const handleApprove = async (sendDirect = false) => {
        if (!account || !spender || (!approveAmount && !unlimited)) {
            alert('请填写完整信息');
            return;
        }
        try {
            setLoading(true);
            if (!binanceW3W?.tron) throw new Error('钱包未连接');
            const amount = unlimited ? MAX_UINT256 : (Math.floor(Number(approveAmount) * 1e6)).toString();
            const tx = await buildApproveTx(spender, amount);
            let result;
            if (sendDirect) {
                result = await binanceW3W.tron.signAndSendTransaction(tx);
            } else {
                const signedTx = await binanceW3W.tron.signTransaction(tx);
                result = await tronWeb.trx.sendRawTransaction(signedTx);
            }
            setApproveResult(JSON.stringify(result, null, 2));
            onApproveResult?.(result);
            if (result.result) {
                alert('授权成功！');
            } else {
                alert('授权失败');
            }
        } catch (e: any) {
            setApproveResult(e.message || String(e));
            alert('授权失败: ' + (e.message || String(e)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>USDT 授权 (Approve)</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                授权某合约/地址可花费你的 USDT (approve)
            </p>
            <div style={{ marginBottom: '15px' }}>
                <label>Spender 地址:</label>
                <input
                    type="text"
                    value={spender}
                    onChange={e => setSpender(e.target.value)}
                    placeholder="输入被授权合约/地址"
                    style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
            </div>
            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 2 }}>
                    <label>授权额度 (USDT):</label>
                    <input
                        type="number"
                        value={unlimited ? '' : approveAmount}
                        onChange={e => { setApproveAmount(e.target.value); setUnlimited(false); }}
                        placeholder="输入授权额度"
                        step="0.000001"
                        disabled={unlimited}
                        style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginTop: '24px' }}>
                    <input
                        type="checkbox"
                        checked={unlimited}
                        onChange={e => { setUnlimited(e.target.checked); if (e.target.checked) setApproveAmount(''); }}
                        id="unlimited-approve"
                        style={{ marginRight: '5px' }}
                    />
                    <label htmlFor="unlimited-approve" style={{ cursor: 'pointer' }}>无限授权</label>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => handleApprove(false)}
                    disabled={loading}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? '处理中...' : 'signTransaction'}
                </button>
                <button
                    onClick={() => handleApprove(true)}
                    disabled={loading}
                    style={{ flex: 1, padding: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? '处理中...' : 'signAndSendTransaction'}
                </button>
            </div>
            {approveResult && (
                <div style={{ backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px', marginTop: '15px', fontSize: '12px', overflow: 'auto' }}>
                    <pre>{approveResult}</pre>
                </div>
            )}
        </div>
    );
};

export default ApproveComponent; 