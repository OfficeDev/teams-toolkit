import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as cp from "child_process";
import { PanelType } from "../../src/controls/PanelType";
import { WebviewPanel } from "../../src/controls/webviewPanel";
import { Commands } from "../../src/controls/Commands";

suite("WebviewPanel", () => {
  suite("createOrShow", () => {
    test("will build sample gallery page for Samples", () => {
      const mockConstructor = sinon.stub();
      Object.setPrototypeOf(WebviewPanel, mockConstructor);

      WebviewPanel.createOrShow(PanelType.SampleGallery);

      chai.expect(WebviewPanel.currentPanels.length).equals(1);
      chai.expect(WebviewPanel.currentPanels[0]["panelType"]).equals(PanelType.SampleGallery);
      WebviewPanel.currentPanels = [];
      sinon.restore();
    });

    test("can open both quick start and sample page", () => {
      const mockConstructor = sinon.stub();
      Object.setPrototypeOf(WebviewPanel, mockConstructor);

      WebviewPanel.createOrShow(PanelType.SampleGallery);
      WebviewPanel.createOrShow(PanelType.Survey);

      chai.expect(WebviewPanel.currentPanels.length).equals(2);
      chai.expect(WebviewPanel.currentPanels[0]["panelType"]).equals(PanelType.SampleGallery);
      chai.expect(WebviewPanel.currentPanels[1]["panelType"]).equals(PanelType.Survey);
      WebviewPanel.currentPanels = [];
      sinon.restore();
    });
  });

  suite("isValidNode", () => {
    test("return false for wrong format", () => {
      sinon.stub(cp, "execSync").callsFake(() => {
        return new Buffer("*.b.5");
      });
      WebviewPanel.createOrShow(PanelType.SampleGallery);

      chai.expect(WebviewPanel.currentPanels[0].isValidNode()).equals(false);
      WebviewPanel.currentPanels = [];
      sinon.restore();
    });

    test("return false for not supported version", () => {
      sinon.stub(cp, "execSync").callsFake(() => {
        return new Buffer("v9.5.2");
      });
      WebviewPanel.createOrShow(PanelType.SampleGallery);

      chai.expect(WebviewPanel.currentPanels[0].isValidNode()).equals(false);
      WebviewPanel.currentPanels = [];
      sinon.restore();
    });

    test("return true for supported version", () => {
      sinon.stub(cp, "execSync").callsFake(() => {
        return new Buffer("v10.23.1");
      });
      WebviewPanel.createOrShow(PanelType.SampleGallery);

      chai.expect(WebviewPanel.currentPanels[0].isValidNode()).equals(true);
      WebviewPanel.currentPanels = [];
      sinon.restore();
    });
  });
});
