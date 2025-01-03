import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';

const formatNumber = (input, decimals = 2) => !input ? '' : input.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
});

const colourise = (input, percent = false) => {
    if (!input) {
        return '';
    }
    const styleClass = input >= 0 ? 'green' : 'red';
    const formatted = formatNumber(input, percent ? 1 : 0);
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
        <div class="${(sort.order === 'asc') ? 'green' : 'red'}">
            ${(field !== sort.field) ? ` ` : (sort.order === 'asc') ? ' ▲' : ' ▼'}
        </div>`;

    const Header = ({ label }) => {
        return html`
            <div onClick=${() => handleSort(label)}>
                ${label}
                <${SortSymbol} field=${headerFields[label]} />
            </div>
        `;
    };

    return html`<div class="table-row header">
        ${ Object.keys(headerFields).map((label) => html`<${Header} label=${label} />`) }
    </div>`;
};

const DataRows = ({ data }) => data.map((row) => html`
    <div class="table-row">
        <div class="ticker">
            <div class="title">${row.ticker}</div>
            <div class="small">${row.name}</div>
        </div>
        <div class="right">${formatNumber(row.lastPrice)}</div>
        <div class="right">${colourise(row.dailyPnl)}</div>
        <div class="right">${colourise(row.changePercent, true)}</div>
        <div class="right">${colourise(row.unrealizedPnl)}</div>
        <div class="right">${colourise(row.unrealizedPnlPercent, true)}</div>
        <div class="right">${formatNumber(row.mktValue)}</div>
    </div>
`);

const SummaryTow = ({ summary }) => !summary.positions ? '' : html`
    <div class="table-row footer">
        <div>${summary.positions} positions</div>
        <div></div>
        <div class="right">${colourise(summary.totalDailyPnl)}</div>
        <div class="right">${colourise(summary.todayChange, true)}</div>
        <div class="right">${colourise(summary.totalUnrealisedPnl)}</div>
        <div class="right">${colourise(summary.totalUnrealizedPnlPercent, true)}</div>
        <div class="right">${formatNumber(summary.totalMktValue)}</div>
    </div>
`;

const textFields = [ 'ticker' ];
const sortData = (data, field, order) => {
    const cash = data.find((position) => position.ticker === 'CASH');
    const nonCash = data.filter((position) => position.ticker !== 'CASH');
    let sortedNonCash;
    if (textFields.indexOf(field) === -1) {
        sortedNonCash = nonCash.toSorted((a, b) => (order === 'asc') ? (a[field] - b[field]) : (b[field] - a[field]));
    } else {
        sortedNonCash = nonCash.toSorted((a, b) => (order === 'asc') ? a[field].localeCompare(b[field]) : b[field].localeCompare(a[field]));
    }
    return [ ...sortedNonCash, cash ];
};

const Main = () => {
    const [ data, setData ] = useState([]);
    const [ summary, setSummary ] = useState({});
    const [ sort, setSort ] = useState({ field: 'changePercent', order: 'desc' });
    const [ error, setError ] = useState('');

    useEffect(() => {
        fetch('positions')
            .then(async (response) => {
                if (response.ok) {
                    return response.json();
                }
                throw Error(await response.text());
            })
            .then((response) => setData(sortData(response, sort.field, sort.order)))
            .catch((e) => setError(e.message));
    }, []);

    useEffect(() => {
        if (data.length === 0) {
            return;
        }

        const positions = data.length;
        const totalDailyPnl = data.reduce((sum, item) => sum + item.dailyPnl, 0);
        const totalUnrealisedPnl = data.reduce((sum, item) => sum + item.unrealizedPnl, 0);
        const totalMktValue = data.reduce((sum, item) => sum + item.mktValue, 0);
        const todayChange = (totalDailyPnl * 100) / (totalMktValue - totalDailyPnl);
        const totalUnrealizedPnlPercent = (totalUnrealisedPnl * 100) / (totalMktValue - totalUnrealisedPnl);

        setSummary({ positions, totalDailyPnl, totalUnrealisedPnl, totalMktValue, todayChange, totalUnrealizedPnlPercent });
    }, [ data ]);

    useEffect(() => {
        if (data.length === 0) {
            return;
        }
        setData(sortData(data, sort.field, sort.order));
    }, [ sort ]);

    return error || (!data.length ? 'Loading..' : html`
        <div class="table">
            <${Headers} sort=${sort} setSort=${setSort} />
            <${DataRows} data=${data} />
            <${SummaryTow} summary=${summary} />
        </div>
    `);
};

render(html`<${Main} />`, document.getElementById('root'));
