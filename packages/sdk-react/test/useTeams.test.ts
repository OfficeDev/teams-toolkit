// /* eslint-disable dot-notation */
// // Copyright (c) Wictor Wilén. All rights reserved.
// // Licensed under the MIT license.
// // SPDX-License-Identifier: MIT

// /**
//  * @jest-environment jsdom
//  */

// // eslint-disable-next-line no-use-before-define
// import React from "react";
// import { render, waitFor } from "@testing-library/react";
// import * as useTeams from "./useTeams";
// import { app, pages } from "@microsoft/teams-js";
// import { Flex, Header, Provider } from "@fluentui/react-northstar";

// describe("useTeams", () => {
//     let spyInitialize: jest.SpyInstance;
//     let spyRegisterOnThemeChangeHandler: jest.SpyInstance;
//     let spyRegisterFullScreenHandler: jest.SpyInstance;
//     let spyGetContext: jest.SpyInstance;

//     beforeEach(() => {
//         jest.resetAllMocks();
//         jest.clearAllMocks();

//         window.history.pushState({}, "", "/");

//         spyInitialize = jest.spyOn(app, "initialize");
//         spyInitialize.mockImplementation(() => {
//             return Promise.resolve();
//         });
//         spyRegisterOnThemeChangeHandler = jest.spyOn(app, "registerOnThemeChangeHandler");
//         spyRegisterFullScreenHandler = jest.spyOn(pages, "registerFullScreenHandler");
//         spyGetContext = jest.spyOn(app, "getContext");
//         spyGetContext.mockImplementation(() => {
//             return Promise.resolve({
//                 app: {
//                     theme: "default"
//                 },
//                 page: {
//                     isFullScreen: false
//                 }
//             } as Partial<app.Context>);
//         });
//     });

//     it("Should return not in teams - app.initialize rejects", async () => {
//         spyInitialize.mockImplementation(() => {
//             return Promise.reject(new Error(""));
//         });
//         const App = () => {
//             const [{ inTeams }] = useTeams.useTeams({});
//             return (
//                 <div>{"" + inTeams}</div>
//             );
//         };
//         const { container } = render(<App />);
//         await waitFor(() => {
//             expect(spyInitialize).toBeCalledTimes(1);
//             expect(container.textContent).toBe("false");
//         });
//     });

//     it("Should return not in teams - app.getContext rejects", async () => {
//         spyGetContext.mockImplementation(() => {
//             return Promise.reject(new Error(""));
//         });
//         const App = () => {
//             const [{ inTeams }] = useTeams.useTeams({});
//             return (
//                 <div>{"" + inTeams}</div>
//             );
//         };
//         const { container } = render(<App />);
//         await waitFor(() => {
//             expect(spyInitialize).toBeCalledTimes(1);
//             expect(spyGetContext).toBeCalledTimes(1);
//             expect(container.textContent).toBe("false");
//         });
//     });

//     it("Should create the useTeams hook - in teams", async () => {
//         const App = () => {
//             const [{ inTeams, themeString }] = useTeams.useTeams({});
//             return (
//                 <div><div>{inTeams ? "true" : "false"}</div>,<div> {themeString}</div></div>
//             );
//         };

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(spyInitialize).toBeCalledTimes(1);
//             expect(spyGetContext).toBeCalledTimes(1);
//             expect(spyRegisterFullScreenHandler).toBeCalledTimes(1);
//             expect(spyRegisterOnThemeChangeHandler).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("true, default");
//     });

//     it("Should create the useTeams hook with dark theme", async () => {
//         const App = () => {
//             const [{ inTeams, themeString }] = useTeams.useTeams({ initialTheme: "dark" });
//             return (
//                 <div><div>{inTeams ? "true" : "false"}</div>,<div> {themeString}</div></div>
//             );
//         };

//         spyGetContext.mockImplementation(() => {
//             return Promise.resolve({
//                 app: {
//                     theme: "dark"
//                 },
//                 page: {
//                     isFullScreen: false
//                 }
//             } as Partial<app.Context>);
//         });

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(spyInitialize).toBeCalledTimes(1);
//             expect(spyGetContext).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("true, dark");
//     });

//     it("Should create the useTeams hook with dark theme, based on query string", async () => {
//         window.history.pushState({}, "", "/?theme=dark");
//         const App = () => {
//             const [{ inTeams, themeString }] = useTeams.useTeams({});
//             return (
//                 <div><div>{inTeams ? "true" : "false"}</div>,<div> {themeString}</div></div>
//             );
//         };

//         spyGetContext.mockImplementation(() => {
//             return Promise.resolve({
//                 app: {
//                     theme: "dark"
//                 },
//                 page: {
//                     isFullScreen: false
//                 }
//             } as Partial<app.Context>);
//         });

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(spyInitialize).toBeCalledTimes(1);
//             expect(spyGetContext).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("true, dark");
//     });

//     it("Should create the useTeams hook with contrast theme", async () => {
//         const App = () => {
//             const [{ inTeams, themeString }] = useTeams.useTeams({ initialTheme: "contrast" });
//             return (
//                 <div><div>{inTeams ? "true" : "false"}</div>,<div> {themeString}</div></div>
//             );
//         };

//         spyGetContext.mockImplementation(() => {
//             return Promise.resolve({
//                 app: {
//                     theme: "contrast"
//                 },
//                 page: {
//                     isFullScreen: false
//                 }
//             } as Partial<app.Context>);
//         });

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(spyInitialize).toBeCalledTimes(1);
//             expect(spyGetContext).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("true, contrast");
//     });

//     it("Should create the useTeams hook with default theme, but switch to dark", async () => {
//         const App = () => {
//             const [{ inTeams, themeString }] = useTeams.useTeams({ initialTheme: "default" });
//             return (
//                 <div><div>{inTeams ? "true" : "false"}</div>,<div> {themeString}</div></div>
//             );
//         };

//         spyGetContext.mockImplementation(() => {
//             return Promise.resolve({
//                 app: {
//                     theme: "dark"
//                 },
//                 page: {
//                     isFullScreen: false
//                 }
//             } as Partial<app.Context>);
//         });

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(spyInitialize).toBeCalledTimes(1);
//             expect(spyGetContext).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("true, dark");
//     });

//     it("Should create the useTeams hook with no theme, but switch to default", async () => {
//         const App = () => {
//             const [{ inTeams, themeString }] = useTeams.useTeams({});
//             return (
//                 <div><div>{inTeams ? "true" : "false"}</div>,<div> {themeString}</div></div>
//             );
//         };

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(spyInitialize).toBeCalledTimes(1);
//             expect(spyGetContext).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("true, default");
//     });

//     it("Should call custom theme handler", async () => {
//         const setThemeHandler = jest.fn();
//         const App = () => {
//             const [{ inTeams, themeString }] = useTeams.useTeams({ setThemeHandler });
//             return (
//                 <div><div>{inTeams ? "true" : "false"}</div>,<div> {themeString}</div></div>
//             );
//         };

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(setThemeHandler).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("true, default");
//     });

//     it("Should not be fullscreen", async () => {
//         const App = () => {
//             const [{ fullScreen }] = useTeams.useTeams();
//             return (
//                 <div><div>{fullScreen ? "true" : "false"}</div></div>
//             );
//         };

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(spyRegisterFullScreenHandler).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("false");
//     });

//     it("Should be fullscreen", async () => {
//         const App = () => {
//             const [{ fullScreen }] = useTeams.useTeams();
//             return (
//                 <div><div>{fullScreen ? "true" : "false"}</div></div>
//             );
//         };

//         spyGetContext.mockImplementation(() => {
//             return Promise.resolve({
//                 app: {
//                     theme: "default"
//                 },
//                 page: {
//                     isFullScreen: true
//                 }
//             } as Partial<app.Context>);
//         });

//         const { container } = render(<App />);

//         await waitFor(() => {
//             expect(spyRegisterFullScreenHandler).toBeCalledTimes(1);
//         });

//         expect(container.textContent).toBe("true");
//     });

//     it("Should call useEffect and render Fluent UI components", async () => {
//         const HooksTab = () => {
//             const [{ inTeams, theme }] = useTeams.useTeams({});
//             const [message, setMessage] = React.useState("Loading...");

//             React.useEffect(() => {
//                 if (inTeams === true) {
//                     setMessage("In Microsoft Teams!");
//                 } else {
//                     if (inTeams !== undefined) {
//                         setMessage("Not in Microsoft Teams");
//                     }
//                 }
//             }, [inTeams]);

//             return (
//                 <Provider theme={theme}>
//                     <Flex fill={true}>
//                         <Flex.Item>
//                             <Header content={message} />
//                         </Flex.Item>
//                     </Flex>
//                 </Provider>
//             );
//         };

//         const { container } = render(<HooksTab />);

//         await waitFor(() => {
//             expect(container.textContent).toBe("In Microsoft Teams!");
//         });
//     });

//     it("Should run the functional component three times", async () => {
//         const ping = jest.fn();
//         const pingEffect = jest.fn();

//         const spyAppInit = jest.spyOn(app, "notifyAppLoaded");
//         spyAppInit.mockImplementation(jest.fn());

//         const HooksTab = () => {
//             const [{ inTeams }] = useTeams.useTeams();

//             React.useEffect(() => {
//                 pingEffect();
//                 if (inTeams) {
//                     app.notifyAppLoaded();
//                 }
//             }, [inTeams]);

//             ping();

//             return (
//                 <h1>Test</h1>
//             );
//         };

//         render(<HooksTab />);

//         await waitFor(() => {
//             expect(ping).toBeCalledTimes(3);
//             expect(pingEffect).toBeCalledTimes(2);
//         });

//     });
// });
