import pages = require("ui/page");
import textField = require("ui/text-field");
import observable = require("data/observable");

var context: any;
var closeCallback: Function;

var page: pages.Page;
var usernameTextField: textField.TextField;
var aioKeyTextField: textField.TextField;

export function onShownModally(args: pages.ShownModallyData) {
    context = args.context;
    closeCallback = args.closeCallback;
}

export function onLoaded(args: observable.EventData) {
    page = <pages.Page>args.object;
    usernameTextField = page.getViewById<textField.TextField>("username");
    aioKeyTextField = page.getViewById<textField.TextField>("aioKey");
}

export function onUnloaded() {
}

export function onLoginButtonTap() {
    closeCallback(usernameTextField.text, aioKeyTextField.text);
}