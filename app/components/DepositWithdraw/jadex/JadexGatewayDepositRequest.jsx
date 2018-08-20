import React from "react";
import Translate from "react-translate-component";
import {ChainStore} from "bitsharesjs/es";
import ChainTypes from "components/Utility/ChainTypes";
import BindToChainState from "components/Utility/BindToChainState";
import JadexWithdrawModal from "./JadexWithdrawModal";
import BaseModal from "../../Modal/BaseModal";
import ZfApi from "react-foundation-apps/src/utils/foundation-api";
import AccountBalance from "../../Account/AccountBalance";
import AssetDepositInfo from "components/Utility/AssetDepositInfo";
import AssetDepositFeeWarning from "../../Utility/AssetDepositFeeWarning";
import AssetName from "components/Utility/AssetName";
import assetUtils from "common/asset_utils";
import LinkToAccountById from "components/Utility/LinkToAccountById";
import {requestDepositAddress, getDepositAddress} from "common/gatewayMethods";
import {JadexAPIs} from "api/apiConfig";
import LoadingIndicator from "components/LoadingIndicator";
import counterpart from "counterpart";
import WalletUnlockActions from "../../../actions/WalletUnlockActions";
import WalletDb from "../../../stores/WalletDb";
import AccountActions from "../../../actions/AccountActions";
import QRCode from "qrcode.react";
import PropTypes from "prop-types";

class JadexGatewayDepositRequest extends React.Component {
    static propTypes = {
        gateway: PropTypes.string,
        deposit_coin_type: PropTypes.string,
        deposit_asset_name: PropTypes.string,
        deposit_account: PropTypes.string,
        receive_coin_type: PropTypes.string,
        account: ChainTypes.ChainAccount,
        issuer_account: ChainTypes.ChainAccount,
        deposit_asset: PropTypes.string,
        deposit_wallet_type: PropTypes.string,
        receive_asset: ChainTypes.ChainAsset,
        deprecated_in_favor_of: ChainTypes.ChainAsset,
        deprecated_message: PropTypes.string,
        action: PropTypes.string,
        supports_output_memos: PropTypes.bool.isRequired,
        gate_fee: PropTypes.number,
        min_deposit: PropTypes.number,
        is_available: PropTypes.bool.isRequired,
        required_confirmations: PropTypes.number,
        deposit_fee_enabled: PropTypes.bool.isRequired,
        deposit_fee_time_frame: PropTypes.number,
        deposit_fee_percentage: PropTypes.number,
        deposit_fee_minimum: PropTypes.number,
        deposit_fee_percentage_low_amounts: PropTypes.number,
        coin_info: PropTypes.arrayOf(PropTypes.object)
    };

    static defaultProps = {
        autosubscribe: false,
        required_confirmations: 0,
        deposit_fee_enabled: false,
        deposit_fee_time_frame: 0,
        deposit_fee_percentage: 0,
        deposit_fee_minimum: 0,
        deposit_fee_percentage_low_amounts: 0,
        gate_fee: 0,
        min_deposit: 0,
        coin_info: []
    };

    constructor(props) {
        super(props);

        this.state = {
            receive_address: null,
            loading: false,
            emptyAddressDeposit: false
        };

        this.addDepositAddress = this.addDepositAddress.bind(this);
        this._copy = this._copy.bind(this);
        document.addEventListener("copy", this._copy);
    }

    _copy(e) {
        try {
            if (this.state.clipboardText)
                e.clipboardData.setData("text/plain", this.state.clipboardText);
            else
                e.clipboardData.setData(
                    "text/plain",
                    counterpart
                        .translate("gateway.use_copy_button")
                        .toUpperCase()
                );
            e.preventDefault();
        } catch (err) {
            console.error(err);
        }
    }

    _getDepositObject() {
        return {
            inputCoinType: assetUtils
                .addJadexNameSpace(this.props.deposit_coin_type)
                .toLowerCase(), // TODO why does the backup coin need bridge namespace?
            outputCoinType: this.props.receive_coin_type,
            outputAddress: this.props.account.get("name"),
            url: JadexAPIs.BASE,
            stateCallback: this.addDepositAddress
        };
    }

    componentWillMount() {
        if (WalletDb.isLocked()) {
            this._unlockWallet();
        }

        getDepositAddress({
            coin: this.props.receive_coin_type,
            account: this.props.account.get("name"),
            stateCallback: this.addDepositAddress
        });
    }

    componentWillUnmount() {
        document.removeEventListener("copy", this._copy);
    }

    componentWillReceiveProps(np) {
        if (np.account !== this.props.account) {
            getDepositAddress({
                coin: np.receive_coin_type,
                account: np.account.get("name"),
                stateCallback: this.addDepositAddress
            });
        }
    }

    addDepositAddress(receive_address) {
        if (receive_address.error) {
            receive_address.error.message === "no_address"
                ? this.setState({emptyAddressDeposit: true})
                : this.setState({emptyAddressDeposit: false});
        }

        this.setState({receive_address});
        this.setState({
            loading: false
        });
        this.setState({receive_address});
    }

    requestDepositAddressLoad() {
        this.setState({
            loading: true,
            emptyAddressDeposit: false
        });
        requestDepositAddress(this._getDepositObject());
    }

    getWithdrawModalId() {
        // console.log( "this.props.issuer: ", this.props.issuer_account.toJS() )
        // console.log( "this.receive_asset.issuer: ", this.props.receive_asset.toJS() )
        return (
            "withdraw_asset_" +
            this.props.issuer_account.get("name") +
            "_" +
            this.props.receive_asset.get("symbol")
        );
    }

    onWithdraw() {
        ZfApi.publish(this.getWithdrawModalId(), "open");
    }

    toClipboard(clipboardText) {
        try {
            this.setState({clipboardText}, () => {
                document.execCommand("copy");
            });
        } catch (err) {
            console.error(err);
        }
    }

    _unlockWallet = () => {
        WalletUnlockActions.unlock()
            .then(() => {
                AccountActions.tryToSetCurrentAccount();
            })
            .catch(() => {});
    };

    render() {
        const isDeposit = this.props.action === "deposit";
        let emptyRow = <LoadingIndicator />;
        if (
            !this.props.account ||
            !this.props.issuer_account ||
            !this.props.receive_asset
        )
            return emptyRow;

        let account_balances_object = this.props.account.get("balances");

        const {gate_fee, min_deposit} = this.props;

        let balance = "0 " + this.props.receive_asset.get("symbol");
        if (this.props.deprecated_in_favor_of) {
            let has_nonzero_balance = false;
            let balance_object_id = account_balances_object.get(
                this.props.receive_asset.get("id")
            );
            if (balance_object_id) {
                let balance_object = ChainStore.getObject(balance_object_id);
                if (balance_object) {
                    let balance = balance_object.get("balance");
                    if (balance != 0) has_nonzero_balance = true;
                }
            }
            if (!has_nonzero_balance) return emptyRow;
        }

        // let account_balances = account_balances_object.toJS();
        // let asset_types = Object.keys(account_balances);
        // if (asset_types.length > 0) {
        //     let current_asset_id = this.props.receive_asset.get("id");
        //     if( current_asset_id )
        //     {
        //         balance = (<span><Translate component="span" content="transfer.available"/>: <BalanceComponent balance={account_balances[current_asset_id]}/></span>);
        //     }
        // }

        let receive_address = this.state.receive_address;
        let {emptyAddressDeposit} = this.state;
        let indicatorButtonAddr = this.state.loading;

        if (!receive_address) {
            return (
                <div style={{margin: "3rem"}}>
                    <LoadingIndicator type="three-bounce" />
                </div>
            );
        }

        let withdraw_modal_id = this.getWithdrawModalId();
        let deposit_address_fragment = null;
        let deposit_memo = null;
        // if (this.props.deprecated_in_favor_of)
        // {
        //     deposit_address_fragment = <span>please use {this.props.deprecated_in_favor_of.get("symbol")} instead. <span data-tip={this.props.deprecated_message} data-place="right" data-html={true}><Icon name="question-circle" /></span><ReactTooltip /></span>;
        // }
        // else
        // {
        let clipboardText = "";
        let memoText;

        if (this.props.deposit_account) {
            deposit_address_fragment = (
                <span>{this.props.deposit_account}</span>
            );
            clipboardText =
                this.props.receive_coin_type +
                ":" +
                this.props.account.get("name");
            deposit_memo = <span>{clipboardText}</span>;
            var withdraw_memo_prefix = this.props.deposit_coin_type + ":";
        } else {
            if (receive_address.memo) {
                // This is a client that uses a deposit memo (like ethereum), we need to display both the address and the memo they need to send
                memoText = receive_address.memo;
                clipboardText = receive_address.address;
                deposit_address_fragment = (
                    <span>{receive_address.address}</span>
                );
                deposit_memo = <span>{receive_address.memo}</span>;
            } else {
                // This is a client that uses unique deposit addresses to select the output
                clipboardText = receive_address.address;
                deposit_address_fragment = (
                    <span>{receive_address.address}</span>
                );
            }
            var withdraw_memo_prefix = "";
        }

        if (
            !this.props.is_available ||
            ((isDeposit && !this.props.deposit_account && !receive_address) ||
                (receive_address &&
                    (receive_address.address === "unknown" ||
                        receive_address.address === "Failed to fetch")))
        ) {
            return (
                <div>
                    <Translate
                        className="txtlabel cancel"
                        content="gateway.unavailable"
                        component="h4"
                    />
                </div>
            );
        }

        const depositRightCellStyle = {
            fontWeight: "bold",
            color: "#4A90E2",
            textAlign: "right"
        };

        const labelStyle = {
            whiteSpace: "normal",
            lineHeight: 1.4
        };

        if (isDeposit) {
            return (
                <div className="Blocktrades__gateway grid-block no-padding no-margin">
                    <div className="small-12 medium-5">
                        <Translate
                            component="h4"
                            content="gateway.deposit_summary"
                        />
                        <div className="small-12 medium-10">
                            <table className="table">
                                <tbody>
                                    <tr>
                                        <Translate
                                            component="td"
                                            content="gateway.asset_to_deposit"
                                        />
                                        <td style={depositRightCellStyle}>
                                            {assetUtils.replaceAssetSymbol(
                                                this.props.deposit_asset
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <Translate
                                            component="td"
                                            content="gateway.your_account"
                                        />
                                        <td style={depositRightCellStyle}>
                                            <LinkToAccountById
                                                account={this.props.account.get(
                                                    "id"
                                                )}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <Translate content="gateway.balance" />:
                                        </td>
                                        <td style={depositRightCellStyle}>
                                            <AccountBalance
                                                account={this.props.account.get(
                                                    "name"
                                                )}
                                                asset={this.props.receive_asset.get(
                                                    "symbol"
                                                )}
                                                replace={false}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <Translate content="jadex.gateway.deposit_minimum" />:
                                        </td>
                                        <td style={depositRightCellStyle}>
                                            {(min_deposit || gate_fee * 2) +
                                                " "}
                                            <AssetName
                                                name={this.props.receive_asset.get(
                                                    "symbol"
                                                )}
                                            />
                                        </td>
                                    </tr>
                                    {this.props.required_confirmations > 0 && (
                                        <tr>
                                            <td>
                                                <Translate content="jadex.gateway.required_confirmations" />:
                                            </td>
                                            <td style={depositRightCellStyle}>
                                                {
                                                    this.props
                                                        .required_confirmations
                                                }
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="small-12 medium-7">
                        <Translate
                            component="h4"
                            content="gateway.deposit_inst"
                        />

                        <div className="grid-block no-padding no-margin">
                            <div
                                className="small-12 medium-7 large-9"
                                style={{paddingRight: "1rem"}}
                            >
                                <label className="left-label">
                                    <Translate
                                        content="gateway.deposit_to"
                                        asset={assetUtils.replaceAssetSymbol(
                                            this.props.deposit_asset
                                        )}
                                    />:
                                </label>
                                <label className="fz_12 left-label">
                                    <Translate content="gateway.deposit_notice_delay" />
                                </label>
                                <AssetDepositFeeWarning
                                    asset={{
                                        name: assetUtils.replaceAssetSymbol(
                                            this.props.deposit_asset
                                        ),
                                        depositFeeEnabled: this.props
                                            .deposit_fee_enabled,
                                        depositFeeTimeframe: this.props
                                            .deposit_fee_time_frame,
                                        depositFeePercentage: this.props
                                            .deposit_fee_percentage,
                                        depositFeePercentageLowAmounts: this
                                            .props
                                            .deposit_fee_percentage_low_amounts,
                                        depositFeeMinimum: this.props
                                            .deposit_fee_minimum
                                    }}
                                />
                                <AssetDepositInfo
                                    asset={{info: this.props.coin_info}}
                                />
                                {WalletDb.isLocked() ? (
                                    <div className="content-block">
                                        <Translate
                                            className="label alert"
                                            component="label"
                                            content="jadex.gateway.deposit_login"
                                            style={labelStyle}
                                        />
                                        <div>
                                            <button
                                                className="button primary"
                                                onClick={this._unlockWallet}
                                            >
                                                <Translate content="header.unlock_short" />
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                <Translate
                                    className="label warning"
                                    component="label"
                                    content="gateway.min_deposit_warning_asset"
                                    minDeposit={min_deposit || gate_fee * 2}
                                    coin={assetUtils.replaceAssetSymbol(
                                        this.props.deposit_asset
                                    )}
                                    style={labelStyle}
                                />

                                {!WalletDb.isLocked() ? (
                                    <div>
                                        {emptyAddressDeposit ? (
                                            <Translate content="gateway.please_generate_address" />
                                        ) : (
                                            deposit_address_fragment
                                        )}
                                        <div>
                                            {deposit_memo && (
                                                <span>
                                                    memo: {deposit_memo}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            className="button-group"
                                            style={{paddingTop: 10}}
                                        >
                                            {deposit_address_fragment ? (
                                                <div
                                                    className="button"
                                                    onClick={this.toClipboard.bind(
                                                        this,
                                                        clipboardText
                                                    )}
                                                >
                                                    <Translate content="gateway.copy_address" />
                                                </div>
                                            ) : null}
                                            {memoText ? (
                                                <div
                                                    className="button"
                                                    onClick={this.toClipboard.bind(
                                                        this,
                                                        memoText
                                                    )}
                                                >
                                                    <Translate content="gateway.copy_memo" />
                                                </div>
                                            ) : null}
                                            <button
                                                className={
                                                    "button spinner-button-circle"
                                                }
                                                onClick={this.requestDepositAddressLoad.bind(
                                                    this
                                                )}
                                            >
                                                {indicatorButtonAddr ? (
                                                    <LoadingIndicator type="circle" />
                                                ) : null}
                                                <Translate content="gateway.generate_new" />
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            {!WalletDb.isLocked() ? (
                                <div className="small-12 medium-5 large-3">
                                    {deposit_address_fragment &&
                                        !memoText &&
                                        clipboardText && (
                                            <QRCode
                                                size={140}
                                                value={clipboardText}
                                            />
                                        )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="Blocktrades__gateway grid-block no-padding no-margin">
                    <div className="small-12 medium-5">
                        <Translate
                            component="h4"
                            content="gateway.withdraw_summary"
                        />
                        <div className="small-12 medium-10">
                            <table className="table">
                                <tbody>
                                    <tr>
                                        <Translate
                                            component="td"
                                            content="gateway.asset_to_withdraw"
                                        />
                                        <td
                                            style={{
                                                fontWeight: "bold",
                                                color: "#049cce",
                                                textAlign: "right"
                                            }}
                                        >
                                            <AssetName
                                                name={this.props.receive_asset.get(
                                                    "symbol"
                                                )}
                                                replace={false}
                                            />
                                        </td>
                                    </tr>
                                    <tr>
                                        <Translate
                                            component="td"
                                            content="gateway.asset_to_receive"
                                        />
                                        <td
                                            style={{
                                                fontWeight: "bold",
                                                color: "#049cce",
                                                textAlign: "right"
                                            }}
                                        >
                                            {assetUtils.replaceAssetSymbol(
                                                this.props.deposit_asset
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <Translate content="gateway.balance" />:
                                        </td>
                                        <td
                                            style={{
                                                fontWeight: "bold",
                                                color: "#049cce",
                                                textAlign: "right"
                                            }}
                                        >
                                            <AccountBalance
                                                account={this.props.account.get(
                                                    "name"
                                                )}
                                                asset={this.props.receive_asset.get(
                                                    "symbol"
                                                )}
                                                replace={false}
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/*<p>When you withdraw {this.props.receive_asset.get("symbol")}, you will receive {this.props.deposit_asset} at a 1:1 ratio (minus fees).</p>*/}
                    </div>
                    <div className="small-12 medium-7">
                        <Translate
                            component="h4"
                            content="gateway.withdraw_inst"
                        />
                        <label className="left-label">
                            <Translate
                                content="gateway.withdraw_to"
                                asset={this.props.deposit_asset}
                            />:
                        </label>
                        <div className="button-group" style={{paddingTop: 20}}>
                            <button
                                className="button success"
                                style={{fontSize: "1.3rem"}}
                                onClick={this.onWithdraw.bind(this)}
                            >
                                <Translate content="gateway.withdraw_now" />{" "}
                            </button>
                        </div>
                    </div>
                    <BaseModal id={withdraw_modal_id} overlay={true}>
                        <br />
                        <div className="grid-block vertical">
                            <JadexWithdrawModal
                                account={this.props.account.get("name")}
                                issuer={this.props.issuer_account.get("name")}
                                asset={this.props.receive_asset.get("symbol")}
                                url={JadexAPIs.BASE}
                                output_coin_name={this.props.deposit_asset_name}
                                gateFee={gate_fee}
                                output_coin_symbol={this.props.deposit_asset}
                                output_coin_type={assetUtils
                                    .addJadexNameSpace(
                                        this.props.deposit_coin_type
                                    )
                                    .toLowerCase()}
                                output_wallet_type={
                                    this.props.deposit_wallet_type
                                }
                                output_supports_memos={
                                    this.props.supports_output_memos
                                }
                                memo_prefix={withdraw_memo_prefix}
                                modal_id={withdraw_modal_id}
                                balance={
                                    this.props.account.get("balances").toJS()[
                                        this.props.receive_asset.get("id")
                                    ]
                                }
                            />
                        </div>
                    </BaseModal>
                </div>
            );
        }
    }
}

export default BindToChainState(JadexGatewayDepositRequest, {
    keep_updating: true
});
