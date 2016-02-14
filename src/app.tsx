declare function require(string): string;
import * as $ from 'jquery';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as VoxImplant from 'voximplant-websdk';
import { 
	Button, 
	Grid,
	Row,
	Col,
	Table } from 'react-bootstrap';
require('./app.scss');
import LoginForm from "./LoginForm";

enum AppViews {
	IDLE,
	INIT,
	ERROR,
	AUTH,
	APP,
	FINISH
}

enum AppState {
	IDLE,
	RECORDING,
	PLAYING
}

interface State {
	view: AppViews;
	tip?: string;
	appstate?: AppState; 
}

class App extends React.Component<any, any> {

	voxAPI: VoxImplant.Client;
	appname: string = 'videorecorder';
	accname: string = 'demouser';
	displayName: string;
	username: string;
	call: VoxImplant.Call;
	records: Object[] = [];
	ts: number;
	ts2: number;

	state: State = {
		view: AppViews.IDLE,
		appstate: AppState.IDLE,
		tip: "Please allow access to your camera and microphone"
	};

	constructor() {
		super();
		this.voxAPI = VoxImplant.getInstance();
		// Init
		this.voxAPI.addEventListener(VoxImplant.Events.SDKReady,
			(e: VoxImplant.Events.SDKReady) => this.voxReady(e));
		// Connection
		this.voxAPI.addEventListener(VoxImplant.Events.ConnectionEstablished,
			(e) => this.voxConnectionEstablished(e));
		this.voxAPI.addEventListener(VoxImplant.Events.ConnectionFailed,
			() => this.voxConnectionFailed());
		this.voxAPI.addEventListener(VoxImplant.Events.ConnectionClosed,
			(e) => this.voxConnectionClosed(e));
		// Auth
		this.voxAPI.addEventListener(VoxImplant.Events.AuthResult,
			(e: VoxImplant.Events.AuthResult) => this.voxAuthEvent(e));
		// Misc
		this.voxAPI.addEventListener(VoxImplant.Events.MicAccessResult,
			(e: VoxImplant.Events.MicAccessResult) => this.voxMicAccessResult(e));			 
		this.ts = setInterval(() => this.checkURLs(), 2000);
	}

	componentDidMount() {
		this.start();
	}

	componentDidUpdate() {
		if (this.state.view == AppViews.APP) {
			this.voxAPI.showLocalVideo(true);
			$('#voximplantlocalvideo').prependTo('.col-md-6:first');
			$('#voximplantlocalvideo').css('width', '100%');
			($('#voximplantlocalvideo')[0] as HTMLVideoElement).play();
		}
	}

	start() {
		this.setState({
			view: AppViews.INIT
		})
		try {
			this.voxAPI.init({
				useRTCOnly: true,
				micRequired: true,
				videoSupport: true,
				//videoContainerId: "remote_video"
			});
		} catch(e) {
			this.setState({
				view: AppViews.ERROR,
				tip: "Please use WebRTC compatible browser: Chrome/Chromium, Firefox or Opera"
			});
		}
	}

	voxReady(event: VoxImplant.Events.SDKReady) {
		console.log("VoxImplant WebSDK Ready v. " + event.version);
		console.log(this.voxAPI.isRTCsupported());
		if (!this.voxAPI.isRTCsupported()) {
			this.setState({
				view: AppViews.ERROR,
				tip: "Please use WebRTC compatible browser: Chrome/Chromium, Firefox or Opera"
			});
		}
		else {
			this.voxAPI.connect();
		}
	}

	voxMicAccessResult(event: VoxImplant.Events.MicAccessResult) {
		console.log("Mic access " + (event.result ? "allowed" : "denied"));
		if (event.result) {
			this.setState({ tip: "Establishing connection" });
		}
		else {
			this.setState({ tip: "You should allow access to your camera and microphone to use the service" });
		}
	}

	voxConnectionEstablished(event: VoxImplant.Events.ConnectionEstablished) {
		console.log("VoxImplant connected");
		this.setState({ view: AppViews.AUTH, tip: "Authorization" });		
	}

	voxConnectionFailed() {
		console.log("Connectioned failed");
		this.setState({
			view: AppViews.ERROR,
			tip: "Connection with VoxImplant can't be established"
		});
	}

	voxConnectionClosed(event: VoxImplant.Events.ConnectionClosed) {
		console.log("Connectioned closed");
		this.setState({
			view: AppViews.ERROR,
			tip: "Connection with VoxImplant has been closed"
		});
	}

	authorize(username: string, password: string) {
		this.voxAPI.login(username + "@" + this.appname + "." + this.accname + ".voximplant.com", password);
	}

	voxAuthEvent(event: VoxImplant.Events.AuthResult) {

		if (event.result) {
			this.displayName = event.displayName;			
			this.setState({ view: AppViews.APP, tip: "Ready" });
		} else {				
			(this.refs["loginform"] as LoginForm).loginFailed();
		}

	}

	callDisconnected(event: VoxImplant.CallEvents.Disconnected) {
		this.setState({
			appstate: AppState.IDLE
		});
	}

	callConnected(event: VoxImplant.CallEvents.Connected) {				
		this.setState({
			appstate: AppState.RECORDING
		});
	}

	callFailed(event: VoxImplant.CallEvents.Failed) {
		this.setState({
			appstate: AppState.IDLE
		});
	}

	stopRecording() {
		this.call.hangup();
	}

	startRecording() {
		this.call = this.voxAPI.call("videorec", true);
		this.call.addEventListener(VoxImplant.CallEvents.Disconnected,
			(e: VoxImplant.CallEvents.Disconnected) => this.callDisconnected(e));
		this.call.addEventListener(VoxImplant.CallEvents.Connected,
			(e: VoxImplant.CallEvents.Connected) => this.callConnected(e));
		this.call.addEventListener(VoxImplant.CallEvents.Failed,
			(e: VoxImplant.CallEvents.Failed) => this.callFailed(e));
		this.call.addEventListener(VoxImplant.CallEvents.MessageReceived,
			(e: VoxImplant.CallEvents.MessageReceived) => this.messageReceived(e));
		this.ts2 = setInterval(function() {
			if ($('#'+this.call.getVideoElementId()).length) {
				$('#' + this.call.getVideoElementId()).css('display', 'none');
			}
		}.bind(this), 250);
	}

	messageReceived(e: VoxImplant.CallEvents.MessageReceived) {
		console.log(e.text);
		try {
			let data = JSON.parse(e.text);
			this.records.push({ url: data.url, ready: false });
			this.forceUpdate();
		} catch(e) {
			console.log(e);
		}
	}

	checkURLs() {		
		for (let n = 0; n < this.records.length; n++) {
			if (this.records[n]["ready"] === false) {
				let url = this.records[n]["url"];
				$.ajax({
					type: 'HEAD',
					url: url,
					success: function(data) {
						for (let k = 0; k < this.records.length; k++) {
							if (this.records[k].url == url) this.records[k].ready = true;
							this.forceUpdate();
						}
					}.bind(this),
					error: function(xhr, ajaxOptions, thrownError) {
						if (xhr.status == 404) {
							// not yet
						}
					}.bind(this)
				});
			}
		}
	}

	playVideo(url: string) {
		if ($('#videoplayer').length) $('#videoplayer').remove();
		this.setState({
			appstate: AppState.PLAYING
		});
		$('<video id="videoplayer" style="width: 100%" />').prependTo('.col-md-6:last');
		$('#videoplayer').attr('src', url);
		($('#videoplayer')[0] as HTMLVideoElement).play();
		$('#videoplayer')[0].addEventListener('ended', () => this.playbackFinished(), false);
	}

	playbackFinished() {
		$('#videoplayer').remove();
		this.setState({
			appstate: AppState.IDLE
		});
	}

	render() {
		let element: JSX.Element = <div></div>;

		switch (this.state.view) {
			case AppViews.IDLE:
				return (
					<div>
						{element}
					</div>
				);

			case AppViews.INIT:
				return (
					<div>Establishing connection</div>
				);

			case AppViews.AUTH:
				return (
					<LoginForm onSubmit={(u, p) => this.authorize(u, p)} ref="loginform" />
				);

			case AppViews.APP:
				return (					
					<div>
						<Grid>
							<Row>
								<Col md={6}>
									{this.state.appstate == AppState.IDLE ? 
										<Button bsSize="large" bsStyle="danger" onClick={() => this.startRecording() }>Start Recording</Button> : 
										<Button bsSize="large" bsStyle="danger" onClick={() => this.stopRecording() }>Stop Recording</Button>}
								</Col>
								<Col md={6}>
									<Table responsive>
										<thead>
											<tr>
												<th>Record</th>
											</tr>
										</thead>
										<tbody>											
											{this.records.map(function(obj, index) { return <tr key={index}><td>{obj["ready"] === true ? (<a href="javascript:void(0);" onClick={ () => this.playVideo(obj["url"]) }>{obj["url"]}</a>) : obj["url"]}</td></tr>; }.bind(this)) }											
										</tbody>
									</Table>
								</Col>
							</Row>
						</Grid>
					</div>
				);

			case AppViews.ERROR:
				return (
					<div>
						<div>{this.state.tip}</div>
					</div>
				);

			default:
				return <div></div>;
		}
	}

}

export default App;

ReactDOM.render(<App />, document.getElementById('app'));

