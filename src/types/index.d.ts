export interface UserType {
  channel_id: string;
  username: string;
  user_id: string;
  avatar: string;
  point: number;
  joined: boolean;
}

export interface ParamsType {
  channel_id: string;
  username: string;
  user_id: string;
  avatar: string;
}
export interface WinnerPlayload {
  questionId: string;
  nextQuestionIndex: number;
  user_id: string;
  channel_id: string;
}
export interface ChannelQuestionType {
  [key: string]: {
    currentQuestionIndex: number;
  };
}

export type userObject = {
  [key: string]: UserType[];
};
export type socketToUserType = {
  [key: string]: UserType;
};
