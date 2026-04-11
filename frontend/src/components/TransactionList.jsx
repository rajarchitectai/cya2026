export default function TransactionList({ transactions, loading }) {
  if (loading)
    return <p className="text-sm text-gray-400 py-4">Loading transactions…</p>;

  if (!transactions || transactions.length === 0)
    return (
      <p className="text-sm text-gray-400 py-4">
        No transactions yet. Click <strong>Import History</strong> to load data.
      </p>
    );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Description</th>
            <th className="pb-2 pr-4">Category</th>
            <th className="pb-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{txn.txnDate}</td>
              <td className="py-2 pr-4 font-medium text-gray-800 max-w-xs truncate">{txn.name}</td>
              <td className="py-2 pr-4">
                <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                  {txn.category || '—'}
                </span>
              </td>
              <td className={`py-2 text-right font-semibold ${txn.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {txn.amount < 0 ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
