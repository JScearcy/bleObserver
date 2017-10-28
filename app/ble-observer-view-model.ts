import { Observable, fromObject, PropertyChangeData } from 'data/observable';

import { BleScanConfig } from './resources/ble-scan.config';
import { MQTTService } from './services/mqtt.service';
import { BleObserverService } from './services/ble-observer.service';

/* ***  *** */
export class BLEObserverModel extends Observable {
    public scanButtonText = fromObject({
        value: BleScanConfig.scanButtonTextDefault
    });

    public publishData = fromObject({
        feedString: '',
        dataString: '',
        selectedString: '',
        connectionString: 'Connect'
    });

    private _selectedItem;
    public set selectedItem(item) {
        if (item !== null) {
            this.publishData.set('selectedString', 'Selected: ');
            this.publishData.set('feedString', `${item.name}`);
            this.publishData.set('dataString', `${item.keyValue}`);
        } else {
            this.publishData.set('selectedString', '');
            this.publishData.set('feedString', '');
            this.publishData.set('dataString', '');
        }
        this._selectedItem = item;
    };

    public get selectedItem() {
        return this._selectedItem;
    }
    
    private page;
    private mqttClient: MQTTService;
    private bleObserverService: BleObserverService;


    constructor(page) {
        super();
        this.mqttClient = new MQTTService();
        this.bleObserverService = new BleObserverService();

        this.page = page;

        this.mqttClient.connectedObservable.addEventListener(
            Observable.propertyChangeEvent,
            (data: PropertyChangeData) => {
                if (data.propertyName === 'connected' && data.value === true) {
                    this.publishData.set('connectionString', 'Connected');
                } else if (data.propertyName === 'connected' && data.value === false) {
                    this.publishData.set('connectionString', 'Connect');
                }
            }
        );

        this.bleObserverService.bleObserverStatus.addEventListener(
            Observable.propertyChangeEvent,
            (data: PropertyChangeData) => {
                if (data.propertyName === 'isScanning' && data.value === true) {
                    this.scanButtonText.set('value', BleScanConfig.scanButtonTextScanning);
                } else if (data.propertyName === 'isScanning' && data.value === false) {
                    this.scanButtonText.set('value', BleScanConfig.scanButtonTextDefault);
                }
            }
        )
    }

    public upload() {
        if (this.selectedItem && this.mqttClient.connected) { 
            this.mqttClient.publish(this.selectedItem);
        } else if (this.selectedItem && !this.mqttClient.connected) {
            // Modal if using username and password
            // Extra steps to be taken if going this route ie: login
            this.page.showModal(
                './modal/login-modal',
                'context',
                (function (username: string, aioKey: string) {
                    if (username && aioKey) {
                        this.mqttClient.publish(this.selectedItem, {
                            username,
                            aioKey
                        });
                    }
                }).bind(this),
                true
            );
        }
    }

    public scan() {
        const isScanning = this.bleObserverService.bleObserverStatus.get('isScanning');
        if (!isScanning) {
            this.selectedItem = null;
        }

        this.bleObserverService.observeBle();
    }

    public bleItemTap(args) {
        this.selectedItem = this.bleObserverService.bleItems.getItem(args.index);
    }

    public connect() {
        if (!this.mqttClient.connected) {
            this.page.showModal(
                './modal/login-modal',
                'context',
                (username: string, aioKey: string) => {
                    this.mqttClient.connect({ username, aioKey });
                },
                true
            );
        }
    }
}