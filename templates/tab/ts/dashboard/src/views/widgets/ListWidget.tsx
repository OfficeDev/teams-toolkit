import { Button, Text } from "@fluentui/react-components";
import { List28Filled, MoreHorizontal32Regular } from "@fluentui/react-icons";
import { tokens } from "@fluentui/react-theme";

import { ListModel } from "../../models/listModel";
import { getListData } from "../../services/listService";
import { Widget } from "../lib/Widget";
import { headerContentStyle, headerTextStyle } from "../lib/Widget.styles";
import { itemSubtitleStyle, itemTitleStyle } from "../styles/ListWidget.styles";

/**
 * Extends the Widget class to implement a list widget.
 */
export class ListWidget extends Widget<ListModel[]> {
  /**
   * Get data required by the widget, you can get data from a api call or static data stored in a file.
   * @returns The data required by the widget to render.
   */
  async getData(): Promise<ListModel[]> {
    return getListData();
  }

  /**
   * Define the widget header.
   * @returns The header content, all ReactNode types are supported.
   */
  headerContent(): JSX.Element | undefined {
    return (
      <div style={headerContentStyle()}>
        <List28Filled />
        <Text style={headerTextStyle()}>Your List</Text>
        <Button icon={<MoreHorizontal32Regular />} appearance="transparent" />
      </div>
    );
  }

  /**
   * Define the widget body.
   * @returns The body content, all JSX.Element types are supported.
   */
  bodyContent(): JSX.Element | undefined {
    return (
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {this.state.data &&
          this.state.data.map((t: ListModel) => {
            return (
              <div style={{ display: "grid" }}>
                <div
                  style={{
                    marginBottom: "0.5rem",
                    marginLeft: "-2.25rem",
                    marginRight: "-2.3rem",
                    height: "1px",
                    background: tokens.colorNeutralStroke2,
                  }}
                />
                <Text style={itemTitleStyle()}>{t.title}</Text>
                <Text style={itemSubtitleStyle()}>{t.content}</Text>
              </div>
            );
          })}
      </div>
    );
  }

  /**
   * Define the widget footer.
   * @returns The footer content, all ReactNode types are supported.
   */
  footerContent(): JSX.Element | undefined {
    return (
      <Button
        appearance="primary"
        size="medium"
        style={{ width: "fit-content" }}
        onClick={() => {}} // navigate to detailed page
      >
        View Details
      </Button>
    );
  }
}
