If you want to create a new app that uses the source of the template from the `master` branch, you can execute the following:

```
* tns create my-app-name --template https://github.com/JScearcy/bleObserver.git#master
* add a keys.ts file to the app/resources folder and put the following: 
    export class Keys {
        public static AESKey = < Your AES Key >
        public static AIOUsername = < null (if you want the app to ask for login info) || Your Username >;
        public static AIOKey = < null (same as above) || Your password >;
    }
    These are excluded from git due to the sensitive nature of these items
    
```
