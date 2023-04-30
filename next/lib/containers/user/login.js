import React, { useState } from "react";

import { FormWrapper, FormLabel, FormInput } from "@Components/form";
import { Button, Request } from "@Common/index";
import { useMessage } from "@Components/reducers/message";
import { useRouter } from "next/router";

export const LoginForm = (props) => {
  const [userKey, setUserKey] = useState("");

  const { errorMessage } = useMessage();
  const router = useRouter();

  const updateFormInput = (ev) => {
    ev.preventDefault();
    setUserKey(ev.target.value);
  };

  const onFormSubmit = async (ev) => {
    ev.preventDefault();

    await Request.post(`/api/user/login`, { userKey })
      .then((res) => router.reload())
      .catch((err) => errorMessage(err.response.data.message));
  };

  return (
    <FormWrapper>
      <FormLabel htmlFor="themis-login-input">Login</FormLabel>
      <FormInput
        id="themis-login-input"
        type="text"
        onChange={updateFormInput}
      />
      <Button onClick={onFormSubmit}>Login</Button>
    </FormWrapper>
  );
};
