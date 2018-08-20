import React from "react";
import Translate from "react-translate-component";

let secureLoginAddressPng = require("assets/other/secure-login-address.png");

class CheckUrlWarning extends React.Component {
    render() {
        if (__ELECTRON__) {
            return null;
        }

        return (
            <div className={this.props.align === "left" ? null : "text-center"}>
                <p style={{marginBottom: 5}}>
                    <Translate
                        className="label warning"
                        content="jadex.general.important"
                        component="span"
                        style={{marginRight: 10}}
                    />
                    <Translate
                        content="jadex.general.check_url"
                        component="span"
                    />
                </p>
                <img src={secureLoginAddressPng} alt="" />
            </div>
        );
    }
}

export default CheckUrlWarning;
