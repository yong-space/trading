import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';

const formatNumber = (input) => input.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const colourise = (input, percent = false) => {
    if (!input) {
        return '';
    }
    const styleClass = input >= 0 ? 'green' : 'red';
    const formatted = formatNumber(input);
    return html`<span class="${styleClass}">${formatted}${percent ? '%' : ''}</span>`
};

const headerFields = {
    'Ticker': 'ticker',
    'Price': 'lastPrice',
    'Day': 'dailyPnl',
    'Day %': 'changePercent',
    'Net': 'unrealizedPnl',
    'Net %': 'unrealizedPnlPercent',
    'Value': 'mktValue',
};
// ▲ ▼

const Headers = ({ sort, setSort }) => {
    const handleSort = (label) => {
        const field = headerFields[label];
        let order = 'asc';
        if (sort.field === field) {
            order = sort.order === 'asc' ? 'desc' : 'asc';
        }
        setSort({ field, order });
    };

    const SortSymbol = ({ field }) => html`
        <div class="sorter ${(sort.order === 'asc') ? 'green' : 'red'}">
            ${(field !== sort.field) ? ` ` : (sort.order === 'asc') ? ' ▲' : ' ▼'}
        </div>`;

    const Header = ({ label }) => {
        return html`
            <th onClick=${() => handleSort(label)}>
                ${label}
                <${SortSymbol} field=${headerFields[label]} />
            </th>
        `;
    };

    return html`
        <thead>
            <tr>
                ${ Object.keys(headerFields).map((label) => html`<${Header} label=${label} />`) }
            </tr>
        </thead>
    `;
};

const DataRows = ({ data }) => data.map((row) => html`
    <tr>
        <td>
            <div class="title">${row.ticker}</div>
            <div class="small">${row.name}</div>
        </td>
        <td class="right">${formatNumber(row.lastPrice)}</td>
        <td class="right">${colourise(row.dailyPnl)}</td>
        <td class="right">${colourise(row.changePercent, true)}</td>
        <td class="right">${colourise(row.unrealizedPnl)}</td>
        <td class="right">${colourise(row.unrealizedPnlPercent, true)}</td>
        <td class="right">${formatNumber(row.mktValue)}</td>
    </tr>
`);

const SummaryTow = ({ summary }) => !summary.positions ? '' : html`
    <tr>
        <td colspan="2">${summary.positions} positions</td>
        <td class="right">${colourise(summary.totalDailyPnl)}</td>
        <td class="right">${colourise(summary.todayChange, true)}</td>
        <td class="right">${colourise(summary.totalUnrealisedPnl)}</td>
        <td class="right">${colourise(summary.totalUnrealizedPnlPercent, true)}</td>
        <td class="right">${formatNumber(summary.totalMktValue)}</td>
    </tr>
`;

const clean = (data) => data.map((row) => ({
    ticker: row.ticker,
    name: row.name,
    lastPrice: Number(row.lastPrice.replace(/C/g, '')),
    dailyPnl: Number(row.dailyPnl),
    changePercent: Number(row.changePercent),
    unrealizedPnl: Number(row.unrealizedPnl),
    unrealizedPnlPercent: Number(row.unrealizedPnlPercent.replace(/%/g, '')),
    mktValue: Number(row.mktValue),
}));

const Main = () => {
    const [ data, setData ] = useState([]);
    const [ summary, setSummary ] = useState({});
    const [ sort, setSort ] = useState({ field: 'changePercent', order: 'desc' });

    useEffect(() => {
        fetch('positions')
            .then(async (response) => {
                if (response.ok) {
                    return response.json();
                }
                throw Error(await response.text());
            })
            .then((response) => setData(clean(response)))
            .catch((e) => console.error(e));
    }, []);

    useEffect(() => {
        if (data.length === 0) {
            return;
        }

        const positions = data.length;
        const totalDailyPnl = data.reduce((sum, item) => sum + Number(item.dailyPnl), 0);
        const totalUnrealisedPnl = data.reduce((sum, item) => sum + item.unrealizedPnl, 0);
        const totalMktValue = data.reduce((sum, item) => sum + item.mktValue, 0);
        const todayChange = (totalDailyPnl * 100) / (totalMktValue - totalDailyPnl);
        const totalUnrealizedPnlPercent = (totalUnrealisedPnl * 100) / (totalMktValue - totalUnrealisedPnl);

        setSummary({ positions, totalDailyPnl, totalUnrealisedPnl, totalMktValue, todayChange, totalUnrealizedPnlPercent });
    }, [ data ]);

    useEffect(() => {
        const { field, order } = sort;
        if (field === 'ticker') {
            setData(data.toSorted((a, b) => (order === 'asc') ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker)));
        } else {
            setData(data.toSorted((a, b) => (order === 'asc') ? (a[field] - b[field]) : (b[field] - a[field])));
        }
    }, [ sort ]);

    return data.length === 0 ? 'Loading..' : html`
        <table>
            <${Headers} sort=${sort} setSort=${setSort} />
            <tbody>
                <${DataRows} data=${data} />
            </tbody>
            <tfoot>
                <tr class="divider">
                    <td colspan="7"></td>
                </tr>
                <${SummaryTow} summary=${summary} />
            </tfoot>
        </table>
    `;
};

render(html`<${Main} />`, document.getElementById('root'));
