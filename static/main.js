const formatNumber = (input) => (typeof input === 'number' ? input : input.replace(/C/g, '')).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const colourise = (input) => {
    if (!input) {
        return '';
    }
    const value = (typeof input === 'number') ? input : Number(input.replace(/%/g, ''));
    const styleClass = value >= 0 ? 'green' : 'red';
    const formatted = formatNumber(value);
    return `<span class="${styleClass}">${formatted}</span>`
};

(function(){
    fetch('positions')
        .then((r) => r.json())
        .then((data) => data.toSorted((a, b) => b.changePercent - a.changePercent))
        .then((data) => {
            const rows = data.map((row) => {
                return `<tr>
                    <td>${row.ticker}</td>
                    <td>${row.name}</td>
                    <td class="right">${formatNumber(row.lastPrice)}</td>
                    <td class="right">${colourise(row.changePercent)}</td>
                    <td class="right">${colourise(row.dailyPnl)}</td>
                    <td class="right">${colourise(row.unrealizedPnl)}</td>
                    <td class="right">${colourise(row.unrealizedPnlPercent)}</td>
                    <td class="right">${formatNumber(row.mktValue)}</td>
                </tr>`;
            }).join('');
            document.getElementById('root').innerHTML = rows;

            const totalDailyPnl = data.reduce((sum, item) => sum + Number(item.dailyPnl), 0);
            const totalUnrealisedPnl = data.reduce((sum, item) => sum + item.unrealizedPnl, 0);
            const totalMktValue = data.reduce((sum, item) => sum + item.mktValue, 0);
            const todayChange = (totalDailyPnl * 100) / (totalMktValue - totalDailyPnl);
            const totalUnrealizedPnlPercent = (totalUnrealisedPnl * 100) / (totalMktValue - totalUnrealisedPnl);

            document.getElementById('foot').innerHTML = `
                <td colspan=3>${data.length} positions</td>
                <td class="right">${colourise(todayChange)}</td>
                <td class="right">${colourise(totalDailyPnl)}</td>
                <td class="right">${colourise(totalUnrealisedPnl)}</td>
                <td class="right">${colourise(totalUnrealizedPnlPercent)}</td>
                <td class="right">${formatNumber(totalMktValue)}</td>
            `;
        });
})();
