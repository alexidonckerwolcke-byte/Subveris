declare module '@sendgrid/mail' {
  const mail: {
    setApiKey(apiKey: string): void;
    send(msg: any): Promise<any>;
  };

  export default mail;
}
