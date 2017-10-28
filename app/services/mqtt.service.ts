import { MQTTClient } from 'nativescript-mqtt'
import { Message } from 'nativescript-mqtt/common';
import { Observable, fromObject } from 'data/observable';
import { MQTTConfig } from '../resources/mqtt.config';
import { Keys } from '../resources/keys';

interface EventClass { eventName: string }
class OnConnectionFailure implements EventClass { public eventName = 'onConnectionFailure' }
class OnConnectionSuccess implements EventClass { public eventName = 'onConnectionSuccess' }
class OnConnectionLost implements EventClass { public eventName = 'onConnectionLost' }
class OnMessageArrived  implements EventClass{ public eventName = 'onMessageArrived' }

type MQTTEvents
    = OnConnectionFailure
    | OnConnectionSuccess
    | OnConnectionLost
    | OnMessageArrived

export class MQTTService {
    private mqttClient;
    private username: string;
    public get connected() {
        if (this.mqttClient) {
            return this.mqttClient.connected;
        } else {
            return false;
        }
    }
    public connectedObservable: Observable;

    constructor() {
        this.connectedObservable = fromObject({
            connected: false
        });
        this.mqttClient = new MQTTClient({
            host: MQTTConfig.MQTTHost,
            port: MQTTConfig.MQTTPort,
            useSSL: MQTTConfig.UseSSL
        });        

        this.initialize();
    }

    initialize() {
        this.mqttClient.onConnectionFailure.on((err : any) => {
            this.connectedObservable.set('connected', false);
            console.log("Connection failed: " + JSON.stringify(err));
        });
        this.mqttClient.onConnectionSuccess.on(() => {
            this.connectedObservable.set('connected', true);
            console.log("Connected successfully!");
        });
        this.mqttClient.onConnectionLost.on((err : any) => {
            this.connectedObservable.set('connected', false);
            console.log("Connection lost: " + JSON.stringify(err));
        });
        this.mqttClient.onMessageArrived.on((message: any) => {
            console.log("Message received: " + message.payload);
        });

        if (Keys.AIOUsername && Keys.AIOKey) {
            this.connect({ username: Keys.AIOUsername, aioKey: Keys.AIOKey });
        }
    }

    addEvent(event: MQTTEvents, callback: (arg?) => void) {
        this.mqttClient[event.eventName].on(callback);
    }

    removeEvent(event: MQTTEvents, callback: (arg?) => void) {
        this.mqttClient[event.eventName].off(callback);
    }

    connect(userObj: { username: string, aioKey: string }) {
        this.username = userObj.username;
        this.mqttClient.connect(userObj.username, userObj.aioKey);
    }

    public publish(
        payload: {
            name: string,
            keyValue: string,
            voltDisplay: string,
            countParsed: string,
            timeParsed: string,
        },
        userInfo?: { username: string, aioKey: string}
    ) {

        const [ key, value ] = payload.keyValue.split(':');
        const newPayload = {
            value: payload
        };
        const destination = this.createTopic(this.username);
        const message = new Message({
            payloadString: JSON.stringify(newPayload),
            destinationName: destination,
            retained: true,
            qos: 0
        });

        if (this.mqttClient.connected) {
            this.sendMessage(message);
        } else {
            const callback = () => {
                message.topic = this.createTopic(this.username);
                this.sendMessage(message);
            };
            this.addEvent(new OnConnectionSuccess(), () => {
                callback();
                this.removeEvent(new OnConnectionSuccess(), callback);
            });
            this.connect({ username: userInfo.username, aioKey: userInfo.aioKey });
        }
    }

    sendMessage(message: Message) {
        console.log('message to be published: ', JSON.stringify(message));
        try {
            this.mqttClient.publish(message);
        } catch (err) {
            console.log('error publishing: ', err);
        }
    }

    createTopic(username: string) {
        if (MQTTConfig.ShouldPrependUsername) {
            return `${username}/${MQTTConfig.Feed}`;
        } else {
            return MQTTConfig.Feed;
        }
    }
}