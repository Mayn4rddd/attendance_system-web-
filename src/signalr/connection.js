import { HubConnectionBuilder, HubConnectionState } from "@microsoft/signalr";

const connection = new HubConnectionBuilder()
  .withUrl(`${import.meta.env.VITE_API_URL}/attendanceHub`, {
    accessTokenFactory: () => sessionStorage.getItem("token") ?? "",
  })
  .withAutomaticReconnect()
  .build();

export const startSignalRConnection = async () => {
  if (connection.state === HubConnectionState.Disconnected) {
    await connection.start();
  }
  return connection;
};

export const onReceiveAttendanceUpdate = (callback) => {
  connection.on("ReceiveAttendanceUpdate", callback);
};

export const stopSignalRConnection = async () => {
  if (connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }
};
