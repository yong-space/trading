from ibind import IbkrClient
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class Ibkr:
    def processK(self, val):
        if 'K' in val:
            return float(val.replace('K', '')) * 1000
        else:
            return float(val)

    def cleanPosition(self, row):
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

    def clean(self, row):
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

    def get_positions(self):
        client = IbkrClient(host='localhost')
        account_id = client.portfolio_accounts().data[0]['id']
        full_positions = client.positions(account_id = account_id).data

        positions_fields = [
            'avgCost',
            'conid',
            'ticker',
            'name',
            'unrealizedPnl',
            'mktValue',
            'mktPrice'
        ]
        positions = [
            { k: v for k, v in d.items() if k in positions_fields }
            for d in full_positions
        ]

        marketdata_fields = {
            '31': 'lastPrice',
            '80': 'unrealizedPnlPercent',
            '78': 'dailyPnl',
        }

        try:
            client.receive_brokerage_accounts()
            marketdata = client.live_marketdata_snapshot(
                conids = [ str(item['conid']) for item in full_positions ],
                fields = list(marketdata_fields.keys())
            ).data

            marketdata_fields['conid'] = 'conid'
            processed_marketdata = [
                { marketdata_fields[key]: value for key, value in item.items() if key in marketdata_fields }
                for item in marketdata
            ]

            merged = [
                { **pos, **next(md for md in processed_marketdata if md['conid'] == pos['conid']) }
                for pos in positions
            ]

            return [ self.clean(row) for row in merged ]
        except Exception as e:
            print(e)
            return [ self.cleanPosition(row) for row in positions ]
