import * as CryptoJS from 'nativescript-toolbox/crypto-js';
import { Observable, fromObject } from 'data/observable';
import { ObservableArray } from "tns-core-modules/data/observable-array";
import * as bluetooth from 'nativescript-bluetooth';

import { Keys } from '../resources/keys';
import { BleScanConfig } from '../resources/ble-scan.config';

export class BleObserverService {
    public bleItems = new ObservableArray([]);
    public bleObserverStatus = fromObject({
        isScanning: false
    });
    private bleDiscovered = {};
    private trailingZerosRegex = (/[a-fA-F0-9]+[^0]{2,}/g);
    private key = Keys.AESKey;
    private isBleEnabled: boolean;

    constructor() {
        if (this.key === null || this.key === undefined) {
            throw 'encryption key was not defined';
        }

        bluetooth
            .isBluetoothEnabled()
            .then(isEnabled => {
                this.isBleEnabled = isEnabled;
            })
            .catch(err => console.log(err));
    }

    public observeBle() {
        const isScanning = this.bleObserverStatus.get('isScanning');
        if (isScanning) {
            this.bleObserverStatus.set('isScanning', false);
            this.bleDiscovered = {};
            console.log('scanning complete');
            bluetooth.stopScanning();
        } else {
            this.bleObserverStatus.set('isScanning', true);
            this.bleItems.slice(0);
            console.log('Scanning devices...');
            const scanOptions = {
                onDiscovered: (peripheral) => {
                    this.removeFromState(peripheral.UUID);

                    const peripheralData = this.processPeripheralData(peripheral.UUID, peripheral['advertisement']);
                    const previouslyTracked = this.bleDiscovered[peripheral.UUID];

                    if (
                        (peripheralData && !previouslyTracked) ||
                        (peripheralData && previouslyTracked && peripheralData.countParsed !== previouslyTracked.countParsed)
                    ) {
                        this.bleDiscovered[peripheral.UUID] = peripheralData;
                        this.bleItems.push(peripheralData);
                    }
                }
            };

            if (BleScanConfig.scanTime) {
                scanOptions['seconds'] = BleScanConfig.scanTime;
            }

            bluetooth.startScanning(scanOptions);
        }
    }

    private removeFromState(uuid: string) {
        bluetooth['_connections'][uuid] = undefined;
    }

    private processPeripheralData(UUID: string, advertisement: string) {
        const macAddress = UUID.split(':');
        const lastFourMac = macAddress.slice(macAddress.length - 4).map(hex => parseInt(hex, 16));

        const cryptoWords = CryptoJS.enc.Base64.parse(advertisement);
        const encryptedPayloadRegex = cryptoWords.toString().slice(30).match(this.trailingZerosRegex);
        const encryptedPayload = encryptedPayloadRegex !== null ? encryptedPayloadRegex[0] : '';

        const decodedAdvertisement = atob(advertisement);
        const byteArray = decodedAdvertisement.split('').map(char => {
            return char.charCodeAt(0);
        });

        const initialBits = byteArray.slice(0, 5);
        const macToMatch = byteArray.slice(5, 9);
        const voltage = this.toHexString(byteArray.slice(9, 13));
        
        const hasInitialBits = this.matchBits(BleScanConfig.bleInitialBits, initialBits);
        const hasMacSignature = this.matchBits(lastFourMac, macToMatch);

        if (hasInitialBits && hasMacSignature) {
            const { clockBits, transmitCount, keyValue, fullString } = this.decryptBlePayload(encryptedPayload);
            const voltDisplay = CryptoJS.enc.Latin1.stringify(CryptoJS.enc.Hex.parse(voltage));
            const countParsed = parseInt(transmitCount, 16);
            const timeParsed = parseInt(clockBits, 16);

            const finalBleData = {
                name: UUID,
                keyValue,
                voltDisplay,
                countParsed,
                timeParsed,
            };

            return finalBleData;
        }
    }

    private decryptBlePayload(payload: string)
        : { clockBits: string, transmitCount: string, keyValue: string, fullString: string } {
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Hex.parse(payload)         
        });

        const decryptedPayload = CryptoJS.AES.decrypt(
            cipherParams,
            CryptoJS.enc.Hex.parse(this.key),
            {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.NoPadding
            }
        );

        const decryptedPayloadString = decryptedPayload.toString();
        const clockBits = decryptedPayloadString.substring(0, 4);
        const transmitCount = decryptedPayloadString.substring(4, 6);
        const keyValue = CryptoJS.enc.Latin1.stringify(
            CryptoJS.enc.Hex.parse(decryptedPayloadString.substring(6))
        );

        let [key, value] = keyValue.split(':');
        key = key ? key.replace(/["]/g, '') : key;
        value = value ? value.replace(/\0/g, '') : '';

        return { clockBits, transmitCount, keyValue: `${key}:${value}`, fullString: decryptedPayloadString };
    }

    private toHexString(byteArray: number[]) {
        return Array.from(byteArray, function(byte) {
          return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }).join('');
    }
    
    private matchBits(expected, actual) {
        return expected.reduce((hasExpected, bit, i) => {
            if (hasExpected) {
                return actual[i] === bit;
            } else {
                return hasExpected;
            }
        }, true);
    }
}