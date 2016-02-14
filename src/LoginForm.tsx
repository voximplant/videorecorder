declare function require(string): any;

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import $ = require('jquery');
import {
	Alert,
	Button,
	Panel,
	Input
} from 'react-bootstrap';

interface Props {
	onSubmit: (username: string, password: string) => void;
	ref: string;
}

class LoginForm extends React.Component<Props, any> {

  constructor(props: Props) {
    super(props);
    this.handleAlertDismiss = this.handleAlertDismiss.bind(this);
    this.state = {
    	alertVisible: false
    }
  }

  private componentDidMount() {
  	var el = this.refs["loginForm"];
  	$(el).submit(function(event) {
  		var username = this.refs["username"].getValue(),
  			password = this.refs["password"].getValue();
  		this.props.onSubmit(username, password);
  		event.preventDefault();
	  }.bind(this));
    $("#username_input").focus();
  }

  private handleAlertDismiss() {
    this.setState({alertVisible: false});
  }

  public loginFailed() {
  	this.setState({alertVisible: true});
  }

  render() {
    var alert: JSX.Element;
  	if (this.state.alertVisible) alert = 
  	<Alert bsStyle="danger" onDismiss={this.handleAlertDismiss} dismissAfter={2000}>
    	Wrong username or password were specified
    </Alert>;

    return (
    	<Panel className="loginForm">
    		{alert}
    		<form ref="loginForm">
          <Input ref="username" id="username_input" type="text" placeholder="Username" />
    			<Input ref="password" id="password_input" type="password" placeholder="Password" />
          <Button bsStyle="primary" type="submit">Sign In</Button>
    		</form>
  		</Panel>	 
    );
  }
}

export default LoginForm;