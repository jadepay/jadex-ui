import React from "react";
import {connect} from "alt-react";

import JadexStore from "stores/JadexStore";
import JadexActions from "actions/JadexActions";

import {FormattedDate} from "react-intl";

import LoadingIndicator from "../LoadingIndicator";

class JadexNews extends React.Component {
    constructor() {
        super();

        this.state = {
            news: null
        };
    }

    componentWillMount() {
        JadexActions.getNews.defer();
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.news !== nextProps.JadexNews) {
            this.setState({news: nextProps.JadexNews});
        }
    }

    render() {
        const {news} = this.state;

        if (!news) {
            return <LoadingIndicator type="three-bounce" />;
        }

        return (
            <div className="grid-block vertical medium-horizontal">
                {news.map((article, i) => {
                    return (
                        <div key={"newsArticle" + i} className="medium-6">
                            <article>
                                {article.img ? (
                                    <img
                                        src={article.img}
                                        style={{
                                            float: "left",
                                            maxHeight: "50px",
                                            marginRight: 10,
                                            marginBottom: 10
                                        }}
                                        alt=""
                                    />
                                ) : null}
                                <span
                                    style={{fontSize: "smaller", color: "#bbb"}}
                                >
                                    <FormattedDate
                                        value={article.date}
                                        year="numeric"
                                        month="long"
                                        day="2-digit"
                                    />
                                </span>
                                <h5>{article.title}</h5>
                                <p
                                    dangerouslySetInnerHTML={{
                                        __html: article.text
                                    }}
                                />
                            </article>
                        </div>
                    );
                })}
            </div>
        );
    }
}

export default connect(JadexNews, {
    listenTo() {
        return [JadexStore];
    },
    getProps() {
        return {
            JadexNews: JadexStore.getState().news
        };
    }
});
