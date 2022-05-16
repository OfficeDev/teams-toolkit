import * as React from "react";
import "./Survey.scss";
import { Commands } from "./Commands";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySurveyDataProperty,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";
import { Separator, TextField } from "@fluentui/react";
import TeamsIcon from "../../img/webview/survey/microsoft-teams.svg";

type QuestionChoice = { key: string; val: number };

const q1: QuestionChoice[] = [
  { key: "Extremely Dissatisfied", val: 0 },
  { key: "Moderately Dissatisfied", val: 1 },
  { key: "Slightly Dissatisfied", val: 2 },
  { key: "Neither Satisfied nor Dissatisfied", val: 3 },
  { key: "Slightly Satisfied", val: 4 },
  { key: "Moderately Satisfied", val: 5 },
  { key: "Extremely Satisfied", val: 6 },
];

const q1Title: JSX.Element = (
  <div className="question-title">
    <b>
      Overall, how <span className="highlight">satisfied or dissatisfied</span> are you
      with&nbsp;the Teams Toolkit extension in Visual Studio Code?
    </b>
  </div>
);

const q2: QuestionChoice[] = [
  { key: "0", val: 0 },
  { key: "1", val: 1 },
  { key: "2", val: 2 },
  { key: "3", val: 3 },
  { key: "4", val: 4 },
  { key: "5", val: 5 },
  { key: "6", val: 6 },
  { key: "7", val: 7 },
  { key: "8", val: 8 },
  { key: "9", val: 9 },
  { key: "10", val: 10 },
];

const q2Title: JSX.Element = (
  <div className="question-title">
    <b>
      How likely are you to<span className="highlight"> recommend</span> the Teams Toolkit extension
      in Visual Studio Code to a friend or colleague?
    </b>
  </div>
);

const q2Desc: string[] = ["Not at all likely", "Extremely likely"];

const q3Title: JSX.Element = (
  <div className="question-title">
    <em>(Optional)</em>
    <b>
      {" "}
      What is the <span className="highlight">primary purpose</span> of the Teams app you're
      creating? What is <span className="hightlight">motivating</span> you to develop Teams apps?
    </b>
  </div>
);

const q4Title: JSX.Element = (
  <div className="question-title">
    <em>(Optional)</em>
    <b>
      {" "}
      What, if anything, do you find <span className="highlight">
        frustrating or unappealing
      </span>{" "}
      about the Teams Toolkit in Visual Studio Code? What{" "}
      <span className="highlight">new capabilities</span> would you like to see for the Teams
      Toolkit?
    </b>
  </div>
);

const q5Title: JSX.Element = (
  <div className="question-title">
    <em>(Optional)</em>
    <b>
      {" "}
      What do you like <span className="highlight">best</span> about the Teams Toolkit in Visual
      Studio Code?
    </b>
  </div>
);

class SurveyQuestionChoice extends React.Component<any, any> {
  myRef: any;

  constructor(props: any) {
    super(props);
    this.state = {
      selectedOption: undefined,
    };
    this.onValueChange = this.onValueChange.bind(this);
    this.myRef = React.createRef();
  }

  onValueChange(event: any) {
    this.setState({
      selectedOption: event.target.value,
    });
  }

  render() {
    let desc;
    if (this.props.desc) {
      desc = (
        <div className="question-desc">
          <div className="question-desc-first">{this.props.desc[0]}</div>
          <div className="question-desc-last">{this.props.desc[1]}</div>
        </div>
      );
    } else {
      desc = undefined;
    }

    return (
      <div
        className={this.props.validation ? "question-background" : "question"}
        onChange={this.onValueChange}
        ref={this.myRef}
      >
        {this.props.title}
        <div>&nbsp;</div>
        {desc}
        <div className="question-label">
          {this.props.items.map((item: any) => {
            return <div className="question-label-item">{item.key}</div>;
          })}
        </div>
        <div className="question-radio">
          {this.props.items.map((item: any) => {
            return (
              <div className="question-radio-item">
                <input
                  type="radio"
                  name={this.props.name + "_" + item.key}
                  value={item.val}
                  checked={this.state.selectedOption === item.val.toString()}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

class SurveyQuestionTextField extends React.Component<any, any> {
  myRef: any;
  constructor(props: any) {
    super(props);
    this.state = {
      inputValue: undefined,
    };

    this.onValueChange = this.onValueChange.bind(this);
    this.myRef = React.createRef<SurveyQuestionTextField>();
  }

  onValueChange(
    ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
    newText: string | undefined
  ) {
    this.setState({
      inputValue: newText,
    });
  }

  render() {
    return (
      <div className="question">
        <div className="question-title">{this.props.title}</div>
        <div>&nbsp;</div>
        <div className="question-textfield">
          <TextField multiline rows={4} onChange={this.onValueChange} />
        </div>
      </div>
    );
  }
}

export default class Survey extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      q1Score: React.createRef<SurveyQuestionChoice>(),
      q2Score: React.createRef<SurveyQuestionChoice>(),
      q3Text: React.createRef<SurveyQuestionTextField>(),
      q4Text: React.createRef<SurveyQuestionTextField>(),
      q5Text: React.createRef<SurveyQuestionTextField>(),
    };
  }

  render() {
    if (this.state.surveyTaken === true) {
      return (
        <div className="survey-page">
          <div className="thankyou-page">
            Thank you for taking the time to complete this survey. You can close this page now.
          </div>
        </div>
      );
    } else {
      return (
        <div className="survey-page">
          <div>
            <div className="logo">
              <img src={TeamsIcon} style={{ height: 110, verticalAlign: "middle" }} />
              <p className="logo-text">Microsoft Teams Toolkit</p>
            </div>
            <div>&nbsp;</div>
            <div>
              👋 Hi! I'm Zhenya Savchenko, a Program Manager on the Teams Framework Engineering
              Team. In this 5-10 minute survey, we need your help understanding your experience
              developing Teams apps with the Toolkit in Visual Studio Code.
            </div>
            <div>&nbsp;</div>
            <div>
              <strong>Note: </strong>Below, you'll have options to answer some open questions. We
              need your help shaping our roadmap! Thank you - your help is very much appreciated!
            </div>
            <div>&nbsp;</div>
            <div>
              <a href="https://go.microsoft.com/fwlink/?LinkId=521839">
                <span>Learn more about how Microsoft protects your privacy</span>
              </a>
            </div>
          </div>
          <div className="survey-body">
            <Separator></Separator>
            {this.state.showQ1Error && (
              <div className="validation-error">Please answer this question.</div>
            )}
            <SurveyQuestionChoice
              items={q1}
              title={q1Title}
              ref={this.state.q1Score}
              validation={this.state.showQ1Error}
            />
            <Separator></Separator>
            {this.state.showQ2Error && (
              <div className="validation-error">Please answer this question.</div>
            )}
            <SurveyQuestionChoice
              items={q2}
              title={q2Title}
              desc={q2Desc}
              ref={this.state.q2Score}
              validation={this.state.showQ1Error}
            />
            <Separator></Separator>
            <SurveyQuestionTextField title={q3Title} ref={this.state.q3Text} />
            <Separator></Separator>
            <SurveyQuestionTextField title={q4Title} ref={this.state.q4Text} />
            <Separator></Separator>
            <SurveyQuestionTextField title={q5Title} ref={this.state.q5Text} />
            <div className="submit-div">
              <button className="submit-button" type="submit" onClick={this.onClick}>
                Submit
              </button>
            </div>
          </div>
          <div>&nbsp;</div>
        </div>
      );
    }
  }

  onClick = (event: any) => {
    const q1Score = this.state.q1Score.current.state.selectedOption;
    const q2Score = this.state.q2Score.current.state.selectedOption;
    const q3Text = this.state.q3Text.current.state.inputValue;
    const q4Text = this.state.q4Text.current.state.inputValue;
    const q5Text = this.state.q5Text.current.state.inputValue;
    let sendTelemetry = true;

    if (q1Score === undefined) {
      this.setState({ showQ1Error: true });
      sendTelemetry = false;
    } else {
      this.setState({ showQ1Error: false });
    }

    if (q2Score === undefined) {
      this.setState({ showQ2Error: true });
      sendTelemetry = false;
    } else {
      this.setState({ showQ2Error: false });
    }

    console.log(this.state);
    console.log(sendTelemetry);
    if (sendTelemetry) {
      vscode.postMessage({
        command: Commands.SendTelemetryEvent,
        data: {
          eventName: TelemetryEvent.SurveyData,
          properties: {
            [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
            [TelemetrySurveyDataProperty.Q1Title]:
              "Overall, how satisfied or dissatisfied are you with the Teams Toolkit extension in Visual Studio Code?",
            [TelemetrySurveyDataProperty.Q1Result]: q1Score,
            [TelemetrySurveyDataProperty.Q2Title]:
              "How likely are you to recommend the Teams Toolkit extension in Visual Studio Code to a friend or colleague?",
            [TelemetrySurveyDataProperty.Q2Result]: q2Score,
            [TelemetrySurveyDataProperty.Q3Title]:
              "What is the primary purpose of the Teams app you're creating? What is motivating you to develop Teams apps?",
            [TelemetrySurveyDataProperty.Q3Result]: q3Text,
            [TelemetrySurveyDataProperty.Q4Title]:
              "What, if anything, do you find frustrating or unappealing about the Teams Toolkit in Visual Studio Code? What new capabilities would you like to see for the Teams Toolkit?",
            [TelemetrySurveyDataProperty.Q4Result]: q4Text,
            [TelemetrySurveyDataProperty.Q5Title]:
              "What do you like best about the Teams Toolkit in Visual Studio Code?",
            [TelemetrySurveyDataProperty.Q5Result]: q5Text,
          },
        },
      });

      this.setState({ surveyTaken: true });
    }
  };
}
