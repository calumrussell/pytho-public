import React from "react";
import { useRouter } from "next/router";

import {
  SectionWrapper,
  ComponentWrapper,
  Button,
  Text,
  DoubleHorizontalSpacer,
  RenderIf,
  Request,
} from "@Common/index";
import { useMessage } from "@Components/reducers/message";
import { withSessionSsr } from "@Root/lib/session";
import { Main } from "@Components/main";

import { LoginForm } from "./login";

const Inner = (props) => {
  const { userKey } = props;

  const { errorMessage } = useMessage();
  const router = useRouter();

  const createUserOnClick = () => {
    Request.get("/api/user/create")
      .then(() => router.reload())
      .catch(() => errorMessage("Unable to create user"));
  };

  const logoutUserOnClick = () => {
    Request.get("/api/user/logout")
      .then(() => router.reload())
      .catch(() => errorMessage("Unable to logout user"));
  };

  return (
    <SectionWrapper>
      <ComponentWrapper>
        <RenderIf cond={!userKey}>
          <Button onClick={() => createUserOnClick()}>Create User</Button>
        </RenderIf>
      </ComponentWrapper>
      <ComponentWrapper>
        <RenderIf cond={!userKey}>
          <LoginForm />
        </RenderIf>
      </ComponentWrapper>
      <ComponentWrapper>
        <RenderIf cond={userKey}>
          <Text>
            User key: <br />
            {userKey}
          </Text>
        </RenderIf>
      </ComponentWrapper>
      <ComponentWrapper>
        <RenderIf cond={userKey}>
          <Button onClick={() => logoutUserOnClick()}>Logout User</Button>
        </RenderIf>
      </ComponentWrapper>
      <ComponentWrapper>
        <DoubleHorizontalSpacer>
          <Text>
            When you click create user, you will be given a randomly-generated
            key. This key is used to login.
          </Text>
          <Text>
            Pytho does not store usernames or passwords, only this key. Because
            we do not store any other information, you are not at risk in the
            event of a hack of our systems. We also store no other information
            about users.
          </Text>
          <Text>
            Your key should be stored in a text file or a password manager. If
            you lose your key, we have no way of recoving any data associated
            with that key. You can create as many keys as you want.
          </Text>
        </DoubleHorizontalSpacer>
      </ComponentWrapper>
    </SectionWrapper>
  );
};

export default function User(props) {
  return (
    <Main userKey={props.userKey}>
      <Inner {...props} />
    </Main>
  );
}

export const getServerSideProps = withSessionSsr(
  async function getServerSideProps({ req }) {
    let userKey = null;
    if (req.session.user) {
      if (req.session.user.userKey) {
        userKey = req.session.user.userKey;
      }
    }

    return {
      props: {
        userKey,
      },
    };
  }
);
