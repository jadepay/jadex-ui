import {Map, OrderedMap} from "immutable";
import alt from "alt-instance";
import JadexActions from "actions/JadexActions";

class JadexStore {
    constructor() {
        this.markets = OrderedMap();
        this.assets = Map();
        this.news = null;

        this.bindListeners({
            onGetJadexMarkets: JadexActions.getMarkets,
            onGetJadexNews: JadexActions.getNews
        });
    }

    onGetJadexMarkets(markets) {
        if (markets) {
            markets.map(m => {
                this.markets = this.markets.set(m.id, m);
            });
        }
    }

    onGetJadexNews(news) {
        if (news) {
            this.news = news;
        }
    }
}

export default alt.createStore(JadexStore, "JadexStore");
