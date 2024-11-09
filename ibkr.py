from ibind import IbkrClient
import urllib3
import time
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class Ibkr:
    def __init__(self):
        try:
            self.client = IbkrClient(host='localhost')
            self.account_id = self.client.portfolio_accounts().data[0]['id']
            print('Account ID:', self.account_id)
        except Exception:
            print('Unable to fetch account ID')

    def processK(self, val):
        if 'K' in val:
            return float(val.replace('K', '')) * 1000
        else:
            return float(val)

    def clean_position(self, row):
        unrealizedPnlPercent = row['unrealizedPnl'] / row['mktValue']
        return {
            'ticker': row['ticker'],
            'name': row['name'],
            'lastPrice': row['mktPrice'],
            'dailyPnl': 0,
            'changePercent': 0,
            'unrealizedPnl': row['unrealizedPnl'],
            'unrealizedPnlPercent': unrealizedPnlPercent,
            'mktValue': row['mktValue'],
        }

    def clean_row(self, row):
        lastPrice = float(row['lastPrice'].replace('C', '')) if 'lastPrice' in row and row['lastPrice'] else 0
        dailyPnl = self.processK(row.get('dailyPnl', 0))
        mktValue = float(row['mktValue']) if 'mktValue' in row else 0
        changePercent = (dailyPnl * 100) / (mktValue - dailyPnl) if mktValue != dailyPnl else 0
        unrealizedPnl = float(row.get('unrealizedPnl', 0))
        unrealizedPnlPercent = float(row['unrealizedPnlPercent'].replace('%', '')) if 'unrealizedPnlPercent' in row else 0

        return {
            'ticker': row['ticker'],
            'name': row['name'],
            'lastPrice': lastPrice,
            'dailyPnl': dailyPnl,
            'changePercent': changePercent,
            'unrealizedPnl': unrealizedPnl,
            'unrealizedPnlPercent': unrealizedPnlPercent,
            'mktValue': mktValue,
        }

    positions_fields = [
        'avgCost',
        'conid',
        'ticker',
        'name',
        'unrealizedPnl',
        'mktValue',
        'mktPrice'
    ]

    marketdata_fields = {
        '31': 'lastPrice',
        '80': 'unrealizedPnlPercent',
        '78': 'dailyPnl',
    }

    def get_data(self):
        full_positions = self.client.positions(account_id = self.account_id).data

        positions = [
            { k: v for k, v in d.items() if k in self.positions_fields }
            for d in full_positions
        ]

        self.client.receive_brokerage_accounts()
        marketdata = self.client.live_marketdata_snapshot(
            conids = [ str(item['conid']) for item in full_positions ],
            fields = list(self.marketdata_fields.keys())
        ).data

        self.marketdata_fields['conid'] = 'conid'
        processed_marketdata = [
            { self.marketdata_fields[key]: value for key, value in item.items() if key in self.marketdata_fields }
            for item in marketdata
        ]

        return [
            { **pos, **next(md for md in processed_marketdata if md['conid'] == pos['conid']) }
            for pos in positions
        ]

    def is_bad_data(self, data):
        all_daily_pnl_zero = all(row.get('dailyPnl', 0) == 0 for row in data)
        any_ticker_missing = any('ticker' not in row for row in data)
        return all_daily_pnl_zero or any_ticker_missing

    def get_positions(self):
        if not hasattr(self, 'account_id') or self.account_id is None:
            self.account_id = self.client.portfolio_accounts().data[0]['id']

        attempts = 1
        data = self.get_data()

        while attempts <= 3 and self.is_bad_data(data):
            print('Bad data. Retry attempt', attempts)
            time.sleep(1)
            data = self.get_data()
            attempts += 1

        if attempts == 3:
            return [ self.clean_position(row) for row in data ]

        return [ self.clean_row(row) for row in data ]
