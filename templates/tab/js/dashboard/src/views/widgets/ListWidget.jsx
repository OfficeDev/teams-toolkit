import "../styles/ListWidget.css";

import { Button, Text } from "@fluentui/react-components";
import { List28Filled, MoreHorizontal32Regular } from "@fluentui/react-icons";

import { getListData } from "../../services/listService";
import { Widget } from "../lib/Widget";

/**
 * Extends the Widget class to implement a list widget.
 */
export default class ListWidget extends Widget {
  /**
   * Get data required by the widget, you can get data from a api call or static data stored in a file.
   * @returns The data required by the widget to render.
   */
  async getData() {
    return { data: getListData() };
  }

  /**
   * Define the widget header.
   * @returns The header content, all ReactNode types are supported.
   */
  headerContent() {
    return (
      <div>
        <List28Filled />
        <Text>Your List</Text>
        <Button icon={<MoreHorizontal32Regular />} appearance="transparent" />
      </div>
    );
  }

  /**
   * Define the widget body.
   * @returns The body content, all JSX.Element types are supported.
   */
  bodyContent() {
    return (
      <div className="list-body">
        {this.state.data &&
          this.state.data.map((t) => {
            return (
              <div key={`${t.id}-div`}>
                <div className="divider" />
                <Text className="title">{t.title}</Text>
                <Text className="content">{t.content}</Text>
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
  footerContent() {
    return (
      <Button
        appearance="primary"
        onClick={() => {}} // navigate to detailed page
      >
        View Details
      </Button>
    );
  }
}
