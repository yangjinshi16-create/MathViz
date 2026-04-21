export interface Action {
  id?: string;
  type?: string;
  text?: string;
  narration?: string;
}

export interface SpeechAction extends Action {
  text?: string;
  narration?: string;
  audioId?: string;
}
