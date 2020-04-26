import { mount } from "enzyme";
import React from "react";
import { ModalClose } from "react-modal-bootstrap";
import { Provider } from "react-redux";
import Select from "react-select";

import { it } from "@jest/globals";

import { RemovableError } from "../../../RemovableError";
import mockPopsicle from "../../MockPopsicle";
import * as t from "../../jest-assertions";
import reduxUtils from "../../redux-test-utils";
import { buildInnerHTML, clickMainMenuButton, tick, withGlobalJquery } from "../../test-utils";

const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
const originalInnerWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerWidth");
const originalInnerHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerHeight");

function findNumericInputs(result) {
  const { CreateNumeric } = require("../../../popups/create/CreateNumeric");
  return result.find(CreateNumeric).first();
}

function findLeftInputs(result) {
  return findNumericInputs(result).find("div.form-group").at(1);
}

const simulateClick = async result => {
  result.simulate("click");
  await tick();
};

describe("DataViewer tests", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1205,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 775,
    });

    const mockBuildLibs = withGlobalJquery(() =>
      mockPopsicle.mock(url => {
        const { urlFetcher } = require("../../redux-test-utils").default;
        return urlFetcher(url);
      })
    );

    const mockChartUtils = withGlobalJquery(() => (ctx, cfg) => {
      const chartCfg = { ctx, cfg, data: cfg.data, destroyed: false };
      chartCfg.destroy = () => (chartCfg.destroyed = true);
      chartCfg.getElementsAtXAxis = _evt => [{ _index: 0 }];
      chartCfg.getElementAtEvent = _evt => [{ _datasetIndex: 0, _index: 0, _chart: { config: cfg, data: cfg.data } }];
      return chartCfg;
    });

    jest.mock("popsicle", () => mockBuildLibs);
    jest.mock("chart.js", () => mockChartUtils);
    jest.mock("chartjs-plugin-zoom", () => ({}));
    jest.mock("chartjs-chart-box-and-violin-plot/build/Chart.BoxPlot.js", () => ({}));
  });

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
    Object.defineProperty(window, "innerWidth", originalInnerWidth);
    Object.defineProperty(window, "innerHeight", originalInnerHeight);
  });

  it("DataViewer: build numeric column", async () => {
    const { DataViewer } = require("../../../dtale/DataViewer");
    const CreateColumn = require("../../../popups/create/CreateColumn").ReactCreateColumn;
    const { CreateNumeric } = require("../../../popups/create/CreateNumeric");

    const store = reduxUtils.createDtaleStore();
    buildInnerHTML({ settings: "" }, store);
    const result = mount(
      <Provider store={store}>
        <DataViewer />
      </Provider>,
      { attachTo: document.getElementById("content") }
    );

    await tick();
    clickMainMenuButton(result, "Build Column");
    await tick();
    t.equal(result.find(CreateColumn).length, 1, "should show build column");
    result.find(ModalClose).first().simulate("click");
    t.equal(result.find(CreateColumn).length, 0, "should hide build column");
    clickMainMenuButton(result, "Build Column");
    await tick();
    result.update();
    t.equal(result.find(CreateNumeric).length, 1, "should show build numeric column");
    result
      .find(CreateColumn)
      .find("div.form-group")
      .first()
      .find("input")
      .first()
      .simulate("change", { target: { value: "numeric_col" } });
    await simulateClick(findNumericInputs(result).find("div.form-group").first().find("button").first());
    await simulateClick(findLeftInputs(result).find("button").first());
    await simulateClick(findLeftInputs(result).find("button").last());
    await simulateClick(findLeftInputs(result).find("button").first());
    findLeftInputs(result).find(Select).first().instance().onChange({ value: "col1" });
    await tick();
    findNumericInputs(result).find("div.form-group").at(2).find(Select).first().instance().onChange({ value: "col2" });
    result.find("div.modal-footer").first().find("button").first().simulate("click");
  });

  it("DataViewer: build column errors", async () => {
    const { DataViewer } = require("../../../dtale/DataViewer");
    const CreateColumn = require("../../../popups/create/CreateColumn").ReactCreateColumn;

    const store = reduxUtils.createDtaleStore();
    buildInnerHTML({ settings: "" }, store);
    const result = mount(
      <Provider store={store}>
        <DataViewer />
      </Provider>,
      { attachTo: document.getElementById("content") }
    );

    await tick();
    clickMainMenuButton(result, "Build Column");
    await tick();
    t.equal(result.find(CreateColumn).length, 1, "should show build column");
    result.find("div.modal-footer").first().find("button").first().simulate("click");
    t.equal(result.find(RemovableError).text(), "Name is required!", "should render error");
    result
      .find(CreateColumn)
      .find("div.form-group")
      .first()
      .find("input")
      .first()
      .simulate("change", { target: { value: "col4" } });
    result.find("div.modal-footer").first().find("button").first().simulate("click");
    t.equal(result.find(RemovableError).text(), "The column 'col4' already exists!", "should render error");
    result
      .find(CreateColumn)
      .find("div.form-group")
      .first()
      .find("input")
      .first()
      .simulate("change", { target: { value: "error" } });
    result.find("div.modal-footer").first().find("button").first().simulate("click");
    t.equal(result.find(RemovableError).text(), "Please select an operation!", "should render error");

    await simulateClick(findNumericInputs(result).find("div.form-group").first().find("button").first());
    await simulateClick(findLeftInputs(result).find("button").first());
    findLeftInputs(result).find(Select).first().instance().onChange({ value: "col1" });
    await tick();
    findNumericInputs(result).find("div.form-group").at(2).find(Select).first().instance().onChange({ value: "col2" });
    await simulateClick(result.find("div.modal-footer").first().find("button").first());
    t.equal(result.find(RemovableError).text(), "error test", "should render error");
  });

  it("DataViewer: build numeric cfg validation", () => {
    const { validateNumericCfg } = require("../../../popups/create/CreateNumeric");
    const cfg = {};
    t.equal(validateNumericCfg(cfg), "Please select an operation!");
    cfg.operation = "x";
    cfg.left = { type: "col", col: null };
    t.equal(validateNumericCfg(cfg), "Left side is missing a column selection!");
    cfg.left = { type: "val", val: null };
    t.equal(validateNumericCfg(cfg), "Left side is missing a static value!");
    cfg.left.val = "x";
    cfg.right = { type: "col", col: null };
    t.equal(validateNumericCfg(cfg), "Right side is missing a column selection!");
    cfg.right = { type: "val", val: null };
    t.equal(validateNumericCfg(cfg), "Right side is missing a static value!");
  });
});
