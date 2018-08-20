import React from "react";
import {connect} from "alt-react";
import LazyImage from "./LazyImage";
import JadexStore from "../../stores/JadexStore";
import PropTypes from "prop-types";

class AssetImage extends React.Component {
    static propTypes = {
        name: PropTypes.string,
        marketId: PropTypes.string
    };

    constructor(props) {
        super();

        this.state = {
            src: this._getImgSrcFromProps(props)
        };
    }

    componentWillReceiveProps(nextProps) {
        if (
            nextProps.JadexMarket !== this.props.JadexMarket ||
            nextProps.name !== this.props.name
        ) {
            this.setState({src: this._getImgSrcFromProps(nextProps)});
        }
    }

    _onImageError() {
        this.setState({src: null});
    }

    _getImgSrcFromProps(props) {
        let {name, marketId, JadexMarket} = props;

        let img, symbol;

        if (JadexMarket && JadexMarket.img) {
            img = JadexMarket.img;
        }

        if (!img) {
            if (!name && marketId) {
                symbol = marketId.split("_").shift();
            } else {
                const imgSplit = name.split(".");
                symbol = imgSplit.length === 2 ? imgSplit[1] : imgSplit[0];
            }

            img = `${__BASE_URL__}assets/${symbol.toLowerCase()}.png`;
        }

        if (
            img.match(/^\//) &&
            location.hostname !== "wallet.jadex.org"
        ) {
            img = "https://wallet.jadex.org" + img;
        }

        return img;
    }

    render() {
        const {style, lazy} = this.props;
        const {src} = this.state;

        return src ? (
            <LazyImage
                onError={this._onImageError.bind(this)}
                style={style || {}}
                src={src}
                lazy={lazy === true}
            />
        ) : (
            <span />
        );
    }
}

export default connect(AssetImage, {
    listenTo() {
        return [JadexStore];
    },
    getProps(props) {
        return {
            JadexMarket: props.marketId
                ? JadexStore.getState().markets.get(props.marketId)
                : null
        };
    }
});
