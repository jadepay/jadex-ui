import assetConstants from "../chain/asset_constants";
import utils from "./utils";

export default class AssetUtils {
    static getFlagBooleans(mask, isBitAsset = false) {
        let booleans = {
            charge_market_fee: false,
            white_list: false,
            override_authority: false,
            transfer_restricted: false,
            disable_force_settle: false,
            global_settle: false,
            disable_confidential: false,
            witness_fed_asset: false,
            committee_fed_asset: false
        };

        if (mask === "all") {
            for (let flag in booleans) {
                if (
                    !isBitAsset &&
                    assetConstants.uia_permission_mask.indexOf(flag) === -1
                ) {
                    delete booleans[flag];
                } else {
                    booleans[flag] = true;
                }
            }
            return booleans;
        }

        for (let flag in booleans) {
            if (
                !isBitAsset &&
                assetConstants.uia_permission_mask.indexOf(flag) === -1
            ) {
                delete booleans[flag];
            } else {
                if (mask & assetConstants.permission_flags[flag]) {
                    booleans[flag] = true;
                }
            }
        }

        return booleans;
    }

    static getFlags(flagBooleans) {
        let keys = Object.keys(assetConstants.permission_flags);

        let flags = 0;

        keys.forEach(key => {
            if (flagBooleans[key] && key !== "global_settle") {
                flags += assetConstants.permission_flags[key];
            }
        });

        return flags;
    }

    static getPermissions(flagBooleans, isBitAsset = false) {
        let permissions = isBitAsset
            ? Object.keys(assetConstants.permission_flags)
            : assetConstants.uia_permission_mask;
        let flags = 0;
        permissions.forEach(permission => {
            if (flagBooleans[permission] && permission !== "global_settle") {
                flags += assetConstants.permission_flags[permission];
            }
        });

        if (isBitAsset) {
            flags += assetConstants.permission_flags["global_settle"];
        }

        return flags;
    }

    static parseDescription(description) {
        let parsed;
        try {
            parsed = JSON.parse(description);
        } catch (error) {}

        return parsed ? parsed : {main: description};
    }

    static getRealAssetNames() {
        return {
            BRIM: "BR1M",
            SUBIX: "SUB1X",
            DV: "DV7",
            NLC: "NLC2",
            XDOGE: "DOGE",
            DOGE: "DOGE (DEPRECATED)"
        };
    }

    static replaceAssetSymbol(symbol) {
        const names = this.getRealAssetNames();
        if (symbol && names[symbol]) {
            return names[symbol];
        }
        return symbol;
    }

    static getCleanAssetSymbol(symbol) {
        return symbol.toUpperCase().replace("JADEX.", "");
    }

    static isBridgeCoinAsset(asset) {
        if (!asset) return false;
        return asset.get("symbol").indexOf("JADEX.") === 0;
    }

    static removeJadexNameSpace(symbol) {
        if (symbol && symbol.match(/^JADEX\./i)) {
            return symbol.toUpperCase().replace("JADEX.", "");
        }

        return symbol;
    }

    static addJadexNameSpace(symbol) {
        if (
            symbol &&
            !symbol.match(/JADEX\./i) &&
            symbol.indexOf(".") === -1
        ) {
            return "JADEX." + symbol;
        }

        return symbol;
    }
}
