export function getText() {
  return 'testing utf-8 characters: юникод не эскейпится 👌';
}

document.body.append(getText());
