If you want to create a new app that uses the source of the template from the `master` branch, you can execute the following:

* `tns create my-app-name --template https://github.com/JScearcy/bleObserver.git#template`
* Add a `keys.ts` file to the app/resources folder and put the following: 
```
export class Keys {
    public static AESKey = < Your AES Key >
    public static AIOUsername = < null (if you want the app to ask for login info) || Your Username >
    public static AIOKey = < null (same as above) || Your password >
}
```
* `tns platform add android`
* `tns run android`